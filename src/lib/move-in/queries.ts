import { usesAssignedCustomerScope } from "@/lib/move-in/field-access";
import { requireMoveInAccess } from "@/lib/move-in/access";
import type { ProjectMemberRow } from "@/lib/move-in/members";
import { readAllRows } from '@/lib/supabase/read-all';
import { readByIds } from '@/lib/supabase/read-by-ids';
import {
  sortCallRows,
  type CallListRow,
} from "@/lib/move-in/calls";
import { extractLegacyGrade, confirmedLegacyVisitKey, LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";
import { VALID_HOLDER_CONTRACT_STATUSES } from "@/lib/move-in/labels";
import {
  MOVE_IN_DAILY_REPORT_TYPE,
  MOVE_IN_REPORT_PHASE,
  sortMoveInReports,
  type MoveInReportRow,
} from "@/lib/move-in/reports";
import {
  isBrokerageContactRole,
  type BrokerageOfficeOption,
} from "@/lib/move-in/brokerages";
import {
  isConsentStatus,
  isDealStatus,
  type DealListRow,
  type UnitDealRecord,
  EMPTY_UNIT_DEAL_TYPED_FIELDS,
  enrichDealIntent,
  validateDealProjectionRelation,
  resolveDealContactTimes,
} from "@/lib/move-in/deals";
import { SPECIAL_REASON_LABELS } from "@/lib/move-in/intent";
import { toSpecialCaseMetadata, type SpecialCaseMetadata, type SpecialCaseRow } from "@/lib/move-in/special-case";
import { sortUnits, type UnitListRow } from "@/lib/move-in/filters";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { buildDashboardActivity, computeMoveInKpis, legacyDashboardSnapshot, type DashboardEvent, type DashboardGrade } from "@/lib/move-in/kpis";
import { todayYmd, worklogDayRange } from "@/lib/worklog/day-range";
import { computeFundingKpiSnapshot } from "@/lib/move-in/funding-kpis";
import { computeGradePromotionKpi } from "@/lib/move-in/grade-promotion";

/** Server-only summary projection: never reads names, phones or consultation content. */
export async function loadDashboard(projectId: string, now = new Date()) {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return {error:true} as const;
  const supabase = await createServerClient();
  const day = worklogDayRange(todayYmd("Asia/Seoul",now),"Asia/Seoul");
  type Unit = {
    unit_id:string; legacy:Array<{unit_id:string}>;
    occupancy:(Pick<OccupancyRow,"occupancy_intent"|"funding_status"|"move_in_status"|"legacy_grade"|"balance_paid_at"|"actual_move_in_date"|"planned_move_in_date"|"next_contact_at"|"contract_id"> & {
      contract:{contract_id:string;customer_id:string;contract_status:string;holder:{assigned_counselor_id:string|null}|null}|null;
    })|null;
  };
  const [units,events,contractsResult,fundingHistoryResult] = await Promise.all([
    readAllRows((from,to)=>supabase.from("project_unit").select(`unit_id,
      occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
        occupancy_intent,funding_status,move_in_status,legacy_grade,balance_paid_at,actual_move_in_date,planned_move_in_date,next_contact_at,contract_id,
        contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
          contract_id,customer_id,contract_status,holder:customer!contract_customer_id_project_id_fkey(assigned_counselor_id))),
      legacy:consultation!consultation_unit_project_fkey(unit_id)
    `,{count:"exact"}).eq("project_id",projectId)
      .eq("legacy.channel","LEGACY_IMPORT").limit(1,{referencedTable:"legacy"})
      .order("unit_id").range(from,to).returns<Unit[]>()),
    readAllRows((from,to)=>supabase.from("consultation")
      .select("id,unit_id,customer_id,consulted_at,contact_type,channel,next_action_at,legacy_grade:structured_tags->>legacy_grade",{count:"exact"})
      .eq("project_id",projectId)
      .gte("consulted_at",day.startIso).lt("consulted_at",day.endIso).lte("consulted_at",now.toISOString())
      .order("consulted_at").order("id").range(from,to).returns<DashboardEvent[]>()),
    readAllRows((from,to)=>supabase.from("contract").select("contract_id,unit_id,customer_id,contract_status",{count:"exact"}).eq("project_id",projectId).eq("contract_status","ACTIVE").order("contract_id").range(from,to)),
    readAllRows((from,to)=>supabase.from("contract_status_history").select("unit_id,contract_id,changed_at,previous_value,new_value,field_changed",{count:"exact"}).eq("project_id",projectId).eq("field_changed","funding_status").gte("changed_at",day.startIso).lt("changed_at",now.toISOString()).order("changed_at").range(from,to)),
  ]);
  if (units.error || events.error || contractsResult.error || fundingHistoryResult.error) return {error:true} as const;
  const visible = units.data.filter(u=>!usesAssignedCustomerScope(projectId, access.role) || u.occupancy?.contract?.holder?.assigned_counselor_id===access.memberId);
  const visibleById = new Map(visible.map(u=>[u.unit_id,u]));
  const today = events.data.filter(e=>visibleById.has(e.unit_id) && visibleById.get(e.unit_id)?.occupancy?.contract?.customer_id === e.customer_id);
  // One prior valid event per exact (unit,holder), in bounded batches. Multiple
  // holders of the same unit go in separate batches so an embedded limit cannot hide one.
  const pairs = [...new Map(today.map(e=>[`${e.unit_id}:${e.customer_id}`,e])).values()];
  const batches: DashboardEvent[][] = [];
  for (const pair of pairs) {
    const batch = batches.find(b=>b.length<100 && !b.some(e=>e.unit_id===pair.unit_id));
    if (batch) batch.push(pair); else batches.push([pair]);
  }
  const baseline:DashboardGrade[]=[];
  for (const batch of batches) {
    const prior = await readAllRows((from,to)=>supabase.from("project_unit")
      .select("unit_id,prior:consultation!consultation_unit_project_fkey(unit_id,customer_id,legacy_grade:structured_tags->>legacy_grade)")
      .eq("project_id",projectId).in("unit_id",batch.map(e=>e.unit_id))
      .or(batch.map(e=>`and(unit_id.eq.${e.unit_id},customer_id.eq.${e.customer_id})`).join(","),{referencedTable:"prior"})
      .lt("prior.consulted_at",day.startIso).in("prior.structured_tags->>legacy_grade",[...LEGACY_GRADE_VALUES])
      .order("consulted_at",{referencedTable:"prior",ascending:false}).order("id",{referencedTable:"prior",ascending:false})
      .limit(1,{referencedTable:"prior"}).order("unit_id").range(from,to)
      .returns<Array<{unit_id:string;prior:DashboardGrade[]}>>());
    if(prior.error) return {error:true} as const;
    baseline.push(...prior.data.flatMap(u=>u.prior));
  }
  const legacyLinked=visible.filter(u=>u.legacy.length>0).length;
  const activeByUnit = new Map<string, typeof contractsResult.data>();
  for (const row of contractsResult.data) activeByUnit.set(row.unit_id, [...(activeByUnit.get(row.unit_id) ?? []), row]);
  const currentSnapshot = visible.flatMap((unit) => {
    const contracts = activeByUnit.get(unit.unit_id) ?? [];
    const occupancy = unit.occupancy;
    if (contracts.length !== 1 || !occupancy || occupancy.contract_id !== contracts[0].contract_id) return [];
    return [{ unitId: unit.unit_id, contractId: contracts[0].contract_id, customerId: contracts[0].customer_id, fundingStatus: occupancy.funding_status, currentGrade: occupancy.legacy_grade }];
  });
  const funding = computeFundingKpiSnapshot(currentSnapshot, fundingHistoryResult.data.map(row => ({ unitId: row.unit_id, contractId: row.contract_id, changedAt: row.changed_at, previousValue: row.previous_value, newValue: row.new_value, fieldChanged: row.field_changed })), day, now.toISOString());
  const promotion = computeGradePromotionKpi(
    currentSnapshot,
    today.map(e => ({ id: e.id, unitId: e.unit_id, customerId: e.customer_id, consultedAt: e.consulted_at, legacyGrade: e.legacy_grade })),
    day,
    now,
    baseline.map((row, i) => ({ id: `baseline-${i}`, unitId: row.unit_id, customerId: row.customer_id, consultedAt: new Date(day.start.getTime() - 1).toISOString(), legacyGrade: row.legacy_grade })),
  );
  const currentC = currentSnapshot.filter(row => row.currentGrade === "C").length;
  const currentD = currentSnapshot.filter(row => row.currentGrade === "D").length;
  return {error:false,data:{
    date:day.dateYmd, initial:legacyDashboardSnapshot(projectId,access.role),
    totalUnits:visible.length,legacyLinked,sourceReview:visible.length-legacyLinked,
    nextScheduled:visible.filter(u=>u.occupancy?.next_contact_at && Date.parse(u.occupancy.next_contact_at)>=now.getTime()).length,
    activity:buildDashboardActivity(today,baseline,now.toISOString()),
    funding: { ...funding.current, newLoanNeededSelectedDay: funding.selectedDay.newLoanNeeded },
    gradePromotion: { ...promotion, currentC, currentD, selectedDate: day.dateYmd },
    currentSnapshotAsOf: now.toISOString(),
    occupancy:computeMoveInKpis(visible.length,visible.map(u=>({
      occupancyIntent:u.occupancy?.occupancy_intent??null,fundingStatus:u.occupancy?.funding_status??null,
      moveInStatus:u.occupancy?.move_in_status??null,balancePaidAt:u.occupancy?.balance_paid_at,
      actualMoveInDate:u.occupancy?.actual_move_in_date,plannedMoveInDate:u.occupancy?.planned_move_in_date,
    }))),
  }} as const;
}

type OccupancyRow =
  Database["public"]["Tables"]["unit_occupancy_status"]["Row"];

export type OccupancyRecord = OccupancyRow;

export type RelatedHolderUnit = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  occupancyIntent: OccupancyRecord["occupancy_intent"] | null;
  fundingStatus: OccupancyRecord["funding_status"] | null;
  moveInStatus: OccupancyRecord["move_in_status"] | null;
};

export type UnitDetail = {
  unitId: string;
  buildingNo: string;
  unitNo: string;
  unitType: string | null;
  customerId: string | null;
  contractId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  // 계약자 명부 주소. 현재 ACTIVE 계약·고객 ID가 명부와 일치할 때만 값이 있다
  contractAddress?: string | null;
  phoneQuality: string | null;
  assignedCounselorId: string | null;
  occupancy: OccupancyRow | null;
  relatedUnits: RelatedHolderUnit[];
};

export type ConsultationHistoryRow = {
  id: string;
  consultedAt: string;
  contactType: string | null;
  purpose: string | null;
  content: string;
  nextActionAt: string | null;
  counselorId: string;
  previousHolder?: boolean;
  sourceHolder?: string | null;
  legacyImported?: boolean;
  legacyCounselorName?: string | null;
  legacyGrade: string | null;
};

export type MoveInSpecialCaseProjection = {
  currentContractId: string;
  currentCustomerId: string;
  specialCase: SpecialCaseMetadata | null;
  reasons: string[];
};

/**
 * Detail-only projection. The metadata row is joined by the exact current
 * contract, so a prior holder's manual case can never be shown to the current
 * holder. Automatic reasons are calculated here on the server and are passed
 * to the client as read-only labels.
 */
export async function loadMoveInSpecialCaseProjection(
  projectId: string,
  unitId: string,
  expectedContractId: string | null,
  legacyGrade: string | null,
  occupancy: OccupancyRow | null,
): Promise<{ error: true } | { error: false; projection: MoveInSpecialCaseProjection | null }> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { error: true };
  const supabase = await createServerClient();
  const { data: contracts, error: contractError } = await supabase
    .from("contract")
    .select("contract_id, unit_id, customer_id, contract_status")
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .eq("contract_status", "ACTIVE");
  if (contractError || contracts.length !== 1) return { error: true };
  const current = contracts[0];
  if (expectedContractId && expectedContractId !== current.contract_id) return { error: true };

  // Task 2 table/RPC types are not yet present in the generated snapshot.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSupabase = supabase as any;
  const { data: special, error: specialError } = await rawSupabase
    .from("move_in_special_case")
    .select("project_id,unit_id,contract_id,manually_flagged,visit_required,abandonment_document_received,termination_document_received,legal_consultation_required,legal_consultation_status,processing_status,memo")
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .eq("contract_id", current.contract_id)
    .maybeSingle();
  if (specialError) return { error: true };

  const intent = enrichDealIntent({
    operationalIntent: occupancy?.operational_intent ?? null,
    occupancyIntent: occupancy?.occupancy_intent ?? null,
    legacyGrade,
    fundingStatus: occupancy?.funding_status ?? null,
    manuallyFlagged: Boolean((special as SpecialCaseRow | null)?.manually_flagged),
  });
  const reasons = intent.specialReasons ?? [];
  return {
    error: false,
    projection: {
      currentContractId: current.contract_id,
      currentCustomerId: current.customer_id,
      specialCase: special ? toSpecialCaseMetadata(special as SpecialCaseRow) : null,
      reasons: reasons.map((reason) => SPECIAL_REASON_LABELS[reason]),
    },
  };
}

export async function loadUnitRows(
  projectId: string,
): Promise<{ rows: UnitListRow[]; error: true } | { rows: UnitListRow[]; error: false }> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { rows: [], error: true };
  const supabase = await createServerClient();
  type ListProjection = {
    unit_id: string; building_no: string; unit_no: string;
    occupancy: (Pick<OccupancyRow, "occupancy_intent" | "funding_status" | "move_in_status" | "legacy_grade" | "operational_intent" | "operational_intent_as_of" | "balance_paid_at" | "actual_move_in_date" | "planned_move_in_date" | "last_contact_at" | "next_contact_at"> & {
      contract: { contract_id: string; customer_id: string; holder: { name: string; phone: string; phone_quality: string | null; assigned_counselor_id: string | null } | null } | null;
    }) | null;
    latest: Array<{ id: string; customer_id: string; consulted_at: string; content: string | null; next_action_at: string | null }>;
  };
  // Embedded limits apply per unit in PostgreSQL, before history reaches this server.
  // Current grades are stored on the active occupancy snapshot. Avoid joining a
  // second consultation history per unit on every list visit.
  const units = await readAllRows((from,to)=>supabase.from("project_unit").select(`
    unit_id, building_no, unit_no,
    occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
      occupancy_intent,funding_status,move_in_status,legacy_grade,operational_intent,operational_intent_as_of,balance_paid_at,actual_move_in_date,planned_move_in_date,last_contact_at,next_contact_at,
      contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
        contract_id,customer_id,holder:customer!contract_customer_id_project_id_fkey(name,phone,phone_quality,assigned_counselor_id))),
    latest:consultation!consultation_unit_project_fkey(id,customer_id,consulted_at,content,next_action_at)
  `,{count:"exact"}).eq("project_id",projectId).order("unit_id")
    .order("consulted_at",{referencedTable:"latest",ascending:false}).order("id",{referencedTable:"latest",ascending:false}).limit(1,{referencedTable:"latest"})
    .range(from,to).returns<ListProjection[]>());
  if (units.error) return {rows:[],error:true};
  const visible = units.data.filter(unit => !usesAssignedCustomerScope(projectId, access.role) || unit.occupancy?.contract?.holder?.assigned_counselor_id === access.memberId);
  const gradeByUnit = new Map<string,string>();
  const missingSnapshotGrades = new Map<string,string>();
  for (const unit of visible) {
    const holderId = unit.occupancy?.contract?.customer_id;
    const grade = unit.occupancy?.legacy_grade;
    if (grade) gradeByUnit.set(unit.unit_id, grade);
    else if (holderId) missingSnapshotGrades.set(unit.unit_id, holderId);
  }
  if (missingSnapshotGrades.size) {
    // A legacy project without the current snapshot can still fall back to its
    // latest grade for the exact current (unit, holder) pair. Seeded/current
    // projects skip this query entirely.
    const corrected = await readByIds([...missingSnapshotGrades.keys()], (ids,from,to)=>supabase.from("project_unit")
      .select("unit_id,grade:consultation!consultation_unit_project_fkey(customer_id,legacy_grade:structured_tags->>legacy_grade)")
      .eq("project_id",projectId).in("unit_id",ids)
      .or(ids.map(id=>`and(unit_id.eq.${id},customer_id.eq.${missingSnapshotGrades.get(id)})`).join(","),{referencedTable:"grade"})
      .in("grade.structured_tags->>legacy_grade",[...LEGACY_GRADE_VALUES])
      .order("consulted_at",{referencedTable:"grade",ascending:false}).order("id",{referencedTable:"grade",ascending:false})
      .limit(1,{referencedTable:"grade"}).order("unit_id").range(from,to)
      .returns<Array<{unit_id:string;grade:Array<{customer_id:string;legacy_grade:string}>}>>());
    if (corrected.error) return {rows:[],error:true};
    for (const unit of corrected.data) {
      const grade = unit.grade[0];
      if (grade && grade.customer_id === missingSnapshotGrades.get(unit.unit_id)) gradeByUnit.set(unit.unit_id,grade.legacy_grade);
    }
  }
  const rows: UnitListRow[] = [];
  for (const unit of visible) {
    const status = unit.occupancy;
    const contract = status?.contract;
    const holder = contract?.holder;
    if (usesAssignedCustomerScope(projectId, access.role) && holder?.assigned_counselor_id !== access.memberId) continue;
    const latest = unit.latest[0];
    rows.push({
      unitId:unit.unit_id,buildingNo:unit.building_no,unitNo:unit.unit_no,
      customerId: contract?.customer_id ?? null,
      assignedCounselorId: holder?.assigned_counselor_id ?? null,
      customerName:holder?.name ?? null, customerPhone:holder?.phone ?? null, phoneNormalized: null, phoneQuality:holder?.phone_quality ?? null,
      lastConsultedAt: latest?.consulted_at ?? null,
      latestGrade:gradeByUnit.get(unit.unit_id) ?? null,latestConsultation:latest?.content ?? null,
      latestPreviousHolder:Boolean(latest && contract && latest.customer_id !== contract.customer_id),
      operationalIntent:status?.operational_intent ?? null,
      operationalIntentAsOf:status?.operational_intent_as_of ?? null,
      currentContractId:contract?.contract_id ?? null,
      occupancyIntent:status?.occupancy_intent ?? null,fundingStatus:status?.funding_status ?? null,moveInStatus:status?.move_in_status ?? null,
      balancePaidAt:status?.balance_paid_at ?? null,actualMoveInDate:status?.actual_move_in_date ?? null,plannedMoveInDate:status?.planned_move_in_date ?? null,
      lastContactAt:latest?.consulted_at ?? status?.last_contact_at ?? null,
      nextContactAt:status ? status.next_contact_at : latest?.next_action_at ?? null,
      occupancyLastContactAt: status?.last_contact_at ?? null,
      occupancyNextContactAt: status?.next_contact_at ?? null,
    });
  }
  return {rows:sortUnits(rows),error:false};
}

/** Legacy entry point; the board and old callers now share Task 2 current authority. */
export async function loadFloorplanRows(projectId: string) {
  const { loadCurrentFloorplanRows } = await import("@/lib/move-in/floorplan-current.server");
  return loadCurrentFloorplanRows(projectId);
}

export async function loadMoveInReports(
  projectId: string,
): Promise<
  | { rows: MoveInReportRow[]; error: true }
  | { rows: MoveInReportRow[]; error: false }
> {
  const supabase = await createServerClient();
  const result = await supabase
    .from("report")
    .select(
      "report_id, report_date, version, supersedes_report_id, generated_at, generated_by, generated_data",
    )
    .eq("project_id", projectId)
    .eq("report_phase", MOVE_IN_REPORT_PHASE)
    .eq("report_type", MOVE_IN_DAILY_REPORT_TYPE)
    .order("report_date", { ascending: false })
    .order("version", { ascending: false });

  if (result.error) return { rows: [], error: true };

  const rows: MoveInReportRow[] = (result.data ?? []).map((row) => ({
    reportId: row.report_id,
    reportDate: row.report_date,
    version: row.version,
    supersedesReportId: row.supersedes_report_id,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    generatedData: row.generated_data,
  }));

  return { rows: sortMoveInReports(rows), error: false };
}

async function readActiveUnitContract(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  projectId: string,
  unitId: string,
) {
  return supabase.from("contract")
    .select("project_id, unit_id, contract_id, customer_id, holder:customer!contract_customer_id_project_id_fkey(project_id, id, assigned_counselor_id)")
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .eq("contract_status", "ACTIVE")
    .maybeSingle(); // No row or multiple ACTIVE rows must never select a holder arbitrarily.
}

export async function loadUnitDetail(
  projectId: string,
  unitId: string,
): Promise<
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ok"; detail: UnitDetail; consultations: ConsultationHistoryRow[] }
> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { kind: access.kind === "unavailable" ? "error" : "missing" };
  const supabase = await createServerClient();

  const unitResult = await supabase
    .from("project_unit")
    .select("unit_id, building_no, unit_no, unit_type")
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (unitResult.error) return { kind: "error" };
  if (!unitResult.data) return { kind: "missing" };

  const occupancyResult = await supabase
    .from("unit_occupancy_status")
    .select("*")
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (occupancyResult.error) return { kind: "error" };

  let customerName: string | null = null;
  let customerPhone: string | null = null;
  let phoneQuality: string | null = null;
  let customerId: string | null = null;
  let contractId: string | null = null;
  let assignedCounselorId: string | null = null;
  const occupancy = occupancyResult.data;
  const relatedUnits: RelatedHolderUnit[] = [];

  if (!occupancy) return { kind: "missing" };
  if (occupancy) {
    const contractResult = await readActiveUnitContract(supabase, projectId, unitId);

    if (contractResult.error) return { kind: "error" };
    const current = contractResult.data;
    if (!current || current.project_id !== projectId || current.unit_id !== unitId ||
        current.contract_id !== occupancy.contract_id || current.holder?.id !== current.customer_id ||
        current.holder.project_id !== projectId) return { kind: "missing" };

    if (contractResult.data) {
      customerId = contractResult.data.customer_id;
      contractId = occupancy.contract_id;
      const customerResult = await supabase
        .from("customer")
        .select("name, phone, phone_quality, assigned_counselor_id")
        .eq("project_id", projectId)
        .eq("id", contractResult.data.customer_id)
        .maybeSingle();

      if (customerResult.error) return { kind: "error" };
      customerName = customerResult.data?.name ?? null;
      customerPhone = customerResult.data?.phone ?? null;
      phoneQuality = customerResult.data?.phone_quality ?? null;
      assignedCounselorId = customerResult.data?.assigned_counselor_id ?? null;

      if (usesAssignedCustomerScope(projectId, access.role) && assignedCounselorId !== access.memberId) return { kind: "missing" };

      const siblingContracts = await supabase
        .from("contract")
        .select("unit_id, contract_status")
        .eq("project_id", projectId)
        .eq("customer_id", customerId)
        .in("contract_status", [...VALID_HOLDER_CONTRACT_STATUSES]);

      if (siblingContracts.error) return { kind: "error" };
      const siblingUnitIds = [
        ...new Set(
          (siblingContracts.data ?? [])
            .map((row) => row.unit_id)
            .filter((id) => id !== unitId),
        ),
      ];
      if (siblingUnitIds.length > 0) {
        const [siblingUnits, siblingOccupancy] = await Promise.all([
          supabase
            .from("project_unit")
            .select("unit_id, building_no, unit_no")
            .eq("project_id", projectId)
            .in("unit_id", siblingUnitIds),
          supabase
            .from("unit_occupancy_status")
            .select("unit_id, occupancy_intent, funding_status, move_in_status")
            .eq("project_id", projectId)
            .in("unit_id", siblingUnitIds),
        ]);
        if (siblingUnits.error || siblingOccupancy.error) return { kind: "error" };
        const occupancyByUnit = new Map(
          (siblingOccupancy.data ?? []).map((row) => [row.unit_id, row]),
        );
        for (const unit of siblingUnits.data ?? []) {
          const status = occupancyByUnit.get(unit.unit_id);
          relatedUnits.push({
            unitId: unit.unit_id,
            buildingNo: unit.building_no,
            unitNo: unit.unit_no,
            occupancyIntent: status?.occupancy_intent ?? null,
            fundingStatus: status?.funding_status ?? null,
            moveInStatus: status?.move_in_status ?? null,
          });
        }
      }
    }
  }

  if (usesAssignedCustomerScope(projectId, access.role) && assignedCounselorId !== access.memberId) return { kind: "missing" };

  const consultationResult = await readAllRows((from, to) => supabase
    .from("consultation")
    .select("id, customer_id, consulted_at, contact_type, purpose, content, next_action_at, counselor_id, channel, structured_tags", { count: "exact" })
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .order("consulted_at", { ascending: false })
    .order("id", { ascending: false }).range(from, to));
  if (consultationResult.error) return { kind: "error" };
  const sourceKeyCounts = new Map<string, number>();
  for (const row of consultationResult.data) {
    const tags = row.structured_tags;
    if (tags && typeof tags === "object" && !Array.isArray(tags) && typeof tags.legacy_source_key === "string") {
      const key = tags.legacy_source_key;
      sourceKeyCounts.set(key, (sourceKeyCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    kind: "ok",
    detail: {
      unitId: unitResult.data.unit_id,
      buildingNo: unitResult.data.building_no,
      unitNo: unitResult.data.unit_no,
      unitType: unitResult.data.unit_type,
      customerName,
      customerPhone,
      phoneQuality,
      assignedCounselorId,
      occupancy,
      customerId,
      contractId,
      relatedUnits,
    },
    consultations: (consultationResult.data ?? []).map((row) => ({
      id: row.id,
      consultedAt: row.consulted_at,
      contactType: row.channel === "LEGACY_IMPORT" && row.contact_type === "CONSULTATION" &&
        sourceKeyCounts.get(confirmedLegacyVisitKey(projectId, row.structured_tags) ?? "") === 1 ? "VISIT" : projectId === "1283e198-5043-4027-96d6-edcc7a6686c6" && row.channel === "LEGACY_IMPORT" && row.contact_type === "CONSULTATION" ? "CALL" : row.contact_type,
      previousHolder: customerId !== null && row.customer_id !== customerId,
      sourceHolder: row.structured_tags && typeof row.structured_tags === "object" && !Array.isArray(row.structured_tags) && typeof row.structured_tags.legacy_source_holder === "string" ? row.structured_tags.legacy_source_holder : null,
      purpose: row.purpose,
      content: row.content,
      nextActionAt: row.next_action_at,
      counselorId: row.counselor_id,
      legacyImported: row.channel === "LEGACY_IMPORT",
      legacyCounselorName: row.structured_tags && typeof row.structured_tags === "object" && !Array.isArray(row.structured_tags) && typeof row.structured_tags.legacy_counselor_name === "string" ? row.structured_tags.legacy_counselor_name : null,
      legacyGrade: extractLegacyGrade(row.structured_tags),
    })),
  };
}

export async function loadCallRows(
  projectId: string,
): Promise<{ rows: CallListRow[]; error: true } | { rows: CallListRow[]; error: false }> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { rows: [], error: true };
  const supabase = await createServerClient();
  type CallProjection = {
    unit_id: string; building_no: string; unit_no: string;
    occupancy: {
      occupancy_intent: OccupancyRow["occupancy_intent"];
      funding_status: OccupancyRow["funding_status"];
      move_in_status: OccupancyRow["move_in_status"];
      next_contact_at: string | null;
      contract: { customer_id: string; contract_status: string; holder: {
        name: string; phone: string; phone_normalized: string | null;
        phone_quality: string | null; assigned_counselor_id: string | null;
      } | null } | null;
    } | null;
    latest: Array<{ consulted_at: string; legacy_grade: string | null }>;
  };
  // 서버에서 세대별 최신 1건만 투영한다. 공동조회가 열려도 전체 상담 이력을 읽지 않는다.
  const result = await readAllRows((from, to) => supabase.from("project_unit")
    .select(`unit_id,building_no,unit_no,
      occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
        occupancy_intent,funding_status,move_in_status,next_contact_at,
        contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
          customer_id,contract_status,holder:customer!contract_customer_id_project_id_fkey(
            name,phone,phone_normalized,phone_quality,assigned_counselor_id))),
      latest:consultation!consultation_unit_project_fkey(consulted_at,legacy_grade:structured_tags->>legacy_grade)`, { count: "exact" })
    .eq("project_id", projectId).order("unit_id")
    .order("consulted_at", { referencedTable: "latest", ascending: false })
    .order("id", { referencedTable: "latest", ascending: false })
    .limit(1, { referencedTable: "latest" }).range(from, to).returns<CallProjection[]>());
  if (result.error) return { rows: [], error: true };
  const rows: CallListRow[] = result.data.flatMap(unit => {
    const occupancy = unit.occupancy;
    const contract = occupancy?.contract;
    const holder = contract?.holder;
    if (!occupancy || !contract || contract.contract_status !== "ACTIVE" || !holder) return [];
    if (usesAssignedCustomerScope(projectId, access.role) && holder.assigned_counselor_id !== access.memberId) return [];
    const latest = unit.latest[0];
    return [{ unitId: unit.unit_id, buildingNo: unit.building_no, unitNo: unit.unit_no,
      customerId: contract.customer_id, customerName: holder.name, customerPhone: holder.phone,
      phoneQuality: holder.phone_quality, phoneNormalized: holder.phone_normalized,
      assignedCounselorId: holder.assigned_counselor_id,
      latestGrade: extractLegacyGrade({ legacy_grade: latest?.legacy_grade ?? null }),
      occupancyIntent: occupancy.occupancy_intent, fundingStatus: occupancy.funding_status,
      moveInStatus: occupancy.move_in_status, lastConsultedAt: latest?.consulted_at ?? null,
      nextContactAt: occupancy.next_contact_at }];
  });
  return { rows: sortCallRows(rows), error: false };
}

export async function loadDealRows(
  projectId: string,
): Promise<{ rows: DealListRow[]; anomalyCount: number; error: true } | { rows: DealListRow[]; anomalyCount: number; error: false }> {
  const list = await loadUnitRows(projectId);
  if (list.error) return { rows: [], anomalyCount: 0, error: true };
  const supabase = await createServerClient();

  type ActiveContract = { contract_id: string; unit_id: string; customer_id: string; contract_status: string };
  type RawDeal = {
    id: string; unit_id: string; contract_id: string; customer_id: string;
    consent_status: string | null; deal_status: string | null;
    sale_enabled: boolean; jeonse_enabled: boolean; monthly_rent_enabled: boolean;
    sale_note?: string | null; jeonse_note?: string | null; monthly_rent_note?: string | null;
    details?: string | null; updated_at: string | null;
    asking_sale_price_krw?: number | null; jeonse_deposit_krw?: number | null;
    monthly_rent_deposit_krw?: number | null; monthly_rent_amount_krw?: number | null;
    sale_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
    jeonse_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
    monthly_rent_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null;
  };
  type SpecialMeta = {
    project_id: string; unit_id: string; contract_id: string;
    manually_flagged: boolean; visit_required: boolean;
    abandonment_document_received: boolean; termination_document_received: boolean;
    legal_consultation_required: boolean; legal_consultation_status: string | null;
    processing_status: string | null; memo: string | null;
  };
  type Contact = { unit_id: string | null; customer_id: string; consulted_at: string; next_action_at: string | null };

  // These additive Task 2/3 columns are intentionally read through a narrow
  // compatibility cast until generated production types include them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSupabase = supabase as any;
  const [contractsResult, dealsResult, linksResult, specialResult, contactsResult] = await Promise.all([
    supabase.from("contract").select("contract_id,unit_id,customer_id,contract_status").eq("project_id", projectId).eq("contract_status", "ACTIVE"),
    rawSupabase.from("unit_deal").select("id,unit_id,contract_id,customer_id,consent_status,deal_status,sale_enabled,jeonse_enabled,monthly_rent_enabled,sale_note,jeonse_note,monthly_rent_note,details,updated_at,asking_sale_price_krw,jeonse_deposit_krw,monthly_rent_deposit_krw,monthly_rent_amount_krw,sale_listing_status,jeonse_listing_status,monthly_rent_listing_status").eq("project_id", projectId),
    rawSupabase.from("unit_deal_brokerage").select("unit_deal_id,brokerage_office_id"),
    rawSupabase.from("move_in_special_case").select("project_id,unit_id,contract_id,manually_flagged,visit_required,abandonment_document_received,termination_document_received,legal_consultation_required,legal_consultation_status,processing_status,memo").eq("project_id", projectId),
    supabase.from("consultation").select("unit_id,customer_id,consulted_at,next_action_at").eq("project_id", projectId).order("consulted_at", { ascending: false }),
  ]);
  if (contractsResult.error || dealsResult.error || linksResult.error || specialResult.error || contactsResult.error) {
    return { rows: [], anomalyCount: 0, error: true };
  }

  const activeByUnit = new Map<string, ActiveContract[]>();
  for (const contract of (contractsResult.data ?? []) as ActiveContract[]) {
    const current = activeByUnit.get(contract.unit_id) ?? [];
    current.push(contract);
    activeByUnit.set(contract.unit_id, current);
  }
  const dealByUnit = new Map<string, RawDeal>();
  for (const deal of (dealsResult.data ?? []) as unknown as RawDeal[]) dealByUnit.set(deal.unit_id, deal);
  const officesByDeal = new Map<string, string[]>();
  for (const link of linksResult.data ?? []) {
    const current = officesByDeal.get(link.unit_deal_id) ?? [];
    current.push(link.brokerage_office_id);
    officesByDeal.set(link.unit_deal_id, current);
  }
  const specialByKey = new Map<string, SpecialMeta>();
  for (const special of (specialResult.data ?? []) as SpecialMeta[]) {
    specialByKey.set(`${special.project_id}:${special.unit_id}:${special.contract_id}`, special);
  }
  const latestContactByHolder = new Map<string, Contact>();
  for (const contact of (contactsResult.data ?? []) as Contact[]) {
    if (!contact.unit_id) continue;
    const key = `${contact.unit_id}:${contact.customer_id}`;
    if (!latestContactByHolder.has(key)) latestContactByHolder.set(key, contact);
  }

  let anomalyCount = 0;
  const rows: DealListRow[] = [];
  for (const row of list.rows) {
    const active = activeByUnit.get(row.unitId) ?? [];
    const relation = validateDealProjectionRelation({
      currentContractId: row.currentContractId,
      currentCustomerId: row.customerId,
      activeContracts: active.map((item) => ({ contractId: item.contract_id, customerId: item.customer_id })),
      deal: dealByUnit.get(row.unitId) ?? null,
    });
    if (!relation.include) {
      anomalyCount += 1;
      continue;
    }
    const contract = active[0];
    const deal = dealByUnit.get(row.unitId);
    const safeDeal = relation.staleDeal ? undefined : deal;
    const special = specialByKey.get(`${projectId}:${row.unitId}:${contract.contract_id}`);
    const contact = latestContactByHolder.get(`${row.unitId}:${contract.customer_id}`);
    const contactTimes = resolveDealContactTimes({
      latestHolderConsultation: contact ? { consultedAt: contact.consulted_at, nextActionAt: contact.next_action_at } : null,
      occupancyLastContactAt: row.occupancyLastContactAt,
      occupancyNextContactAt: row.occupancyNextContactAt,
    });
    const typed = safeDeal ? {
      askingSalePriceKrw: safeDeal.asking_sale_price_krw ?? null,
      jeonseDepositKrw: safeDeal.jeonse_deposit_krw ?? null,
      monthlyRentDepositKrw: safeDeal.monthly_rent_deposit_krw ?? null,
      monthlyRentAmountKrw: safeDeal.monthly_rent_amount_krw ?? null,
      saleListingStatus: safeDeal.sale_listing_status ?? null,
      jeonseListingStatus: safeDeal.jeonse_listing_status ?? null,
      monthlyRentListingStatus: safeDeal.monthly_rent_listing_status ?? null,
    } : EMPTY_UNIT_DEAL_TYPED_FIELDS;
    const intent = enrichDealIntent({
      operationalIntent: row.operationalIntent,
      occupancyIntent: row.occupancyIntent,
      legacyGrade: row.latestGrade ?? null,
      fundingStatus: row.fundingStatus,
      manuallyFlagged: special?.manually_flagged ?? false,
    });
    const officeIds = safeDeal ? (officesByDeal.get(safeDeal.id) ?? []) : [];
    const rawConsent = safeDeal?.consent_status;
    const rawDealStatus = safeDeal?.deal_status;
    rows.push({
      ...row,
      customerId: contract.customer_id,
      customerPhone: row.customerPhone ?? null,
      phoneNormalized: row.phoneNormalized ?? null,
      lastConsultedAt: row.lastConsultedAt ?? null,
      assignedCounselorId: row.assignedCounselorId ?? null,
      latestGrade: row.latestGrade as CallListRow["latestGrade"] ?? null,
      contractId: contract.contract_id,
      currentContractId: contract.contract_id,
      consentStatus: rawConsent && isConsentStatus(rawConsent) ? rawConsent : null,
      dealStatus: rawDealStatus && isDealStatus(rawDealStatus) ? rawDealStatus : null,
      saleEnabled: safeDeal?.sale_enabled ?? false,
      jeonseEnabled: safeDeal?.jeonse_enabled ?? false,
      monthlyRentEnabled: safeDeal?.monthly_rent_enabled ?? false,
      brokerageCount: officeIds.length,
      updatedAt: safeDeal?.updated_at ?? null,
      officeIds,
      typed,
      ...intent,
      manuallyFlagged: special?.manually_flagged ?? false,
      visitRequired: special?.visit_required ?? false,
      abandonmentDocumentReceived: special?.abandonment_document_received ?? false,
      terminationDocumentReceived: special?.termination_document_received ?? false,
      legalConsultationRequired: special?.legal_consultation_required ?? false,
      legalConsultationStatus: special?.legal_consultation_status ?? null,
      processingStatus: special?.processing_status ?? null,
      specialMemo: special?.memo ?? null,
      lastContactAt: contactTimes.lastContactAt,
      nextContactAt: contactTimes.nextContactAt,
    });
  }
  return { rows, anomalyCount, error: false };
}

export async function loadBrokerageOffices(
  projectId: string,
): Promise<
  | { error: true; offices: BrokerageOfficeOption[] }
  | { error: false; offices: BrokerageOfficeOption[] }
> {
  const supabase = await createServerClient();
  const [officesResult, contactsResult] = await Promise.all([
    supabase
      .from("brokerage_office")
      .select("id, name, address, main_phone, active")
      .eq("project_id", projectId)
      .order("name"),
    supabase
      .from("brokerage_contact")
      .select("id, brokerage_office_id, role, name, phone, active")
      .eq("project_id", projectId),
  ]);

  if (officesResult.error || contactsResult.error) {
    return { error: true, offices: [] };
  }

  const contactsByOffice = new Map<string, BrokerageOfficeOption["contacts"]>();
  for (const row of contactsResult.data ?? []) {
    if (!isBrokerageContactRole(row.role)) continue;
    const current = contactsByOffice.get(row.brokerage_office_id) ?? [];
    current.push({
      id: row.id,
      role: row.role,
      name: row.name,
      phone: row.phone,
      active: row.active,
    });
    contactsByOffice.set(row.brokerage_office_id, current);
  }

  return {
    error: false,
    offices: (officesResult.data ?? []).map((office) => ({
      id: office.id,
      name: office.name,
      address: office.address,
      mainPhone: office.main_phone,
      active: office.active,
      contacts: contactsByOffice.get(office.id) ?? [],
    })),
  };
}

export async function loadUnitDeal(
  projectId: string,
  unitId: string,
  contractId: string | null,
  customerId: string | null,
): Promise<{ error: true } | { error: false; deal: UnitDealRecord | null }> {
  if (!contractId || !customerId) return { error: true };
  const access = await requireMoveInAccess(projectId);
  if (!access.ok || access.projectId !== projectId) return { error: true };
  const supabase = await createServerClient();
  const matchesCurrent = async () => {
    const current = await readActiveUnitContract(supabase, projectId, unitId);
    const row = current.data;
    return !current.error && row?.project_id === projectId && row.unit_id === unitId &&
      row.contract_id === contractId && row.customer_id === customerId &&
      row.holder?.id === customerId && row.holder.project_id === projectId &&
      (!usesAssignedCustomerScope(projectId, access.role) || row.holder.assigned_counselor_id === access.memberId);
  };
  if (!await matchesCurrent()) return { error: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealResult = await (supabase as any)
    .from("unit_deal")
    .select(
      "project_id, unit_id, contract_id, customer_id, id, consent_status, deal_status, sale_enabled, jeonse_enabled, monthly_rent_enabled, sale_note, jeonse_note, monthly_rent_note, details, asking_sale_price_krw, jeonse_deposit_krw, monthly_rent_deposit_krw, monthly_rent_amount_krw, sale_listing_status, jeonse_listing_status, monthly_rent_listing_status",
    )
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .eq("contract_id", contractId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (dealResult.error) return { error: true };
  if (!dealResult.data || dealResult.data.project_id !== projectId || dealResult.data.unit_id !== unitId ||
      dealResult.data.contract_id !== contractId || dealResult.data.customer_id !== customerId) {
    return await matchesCurrent() ? { error: false, deal: null } : { error: true };
  }

  const linksResult = await supabase
    .from("unit_deal_brokerage")
    .select("brokerage_office_id, brokerage_contact_id")
    .eq("unit_deal_id", dealResult.data.id);

  if (linksResult.error || !await matchesCurrent()) return { error: true };

  const consentStatus = isConsentStatus(dealResult.data.consent_status)
    ? dealResult.data.consent_status
    : "NOT_CONSENTED";
  const dealStatus = isDealStatus(dealResult.data.deal_status)
    ? dealResult.data.deal_status
    : "IN_PROGRESS";

  return {
    error: false,
    deal: {
      consentStatus,
      dealStatus,
      saleEnabled: dealResult.data.sale_enabled,
      jeonseEnabled: dealResult.data.jeonse_enabled,
      monthlyRentEnabled: dealResult.data.monthly_rent_enabled,
      saleNote: dealResult.data.sale_note ?? "",
      jeonseNote: dealResult.data.jeonse_note ?? "",
      monthlyRentNote: dealResult.data.monthly_rent_note ?? "",
      details: dealResult.data.details ?? "",
      brokerages: (linksResult.data ?? []).map((link) => ({
        brokerageOfficeId: link.brokerage_office_id,
        brokerageContactId: link.brokerage_contact_id,
      })),
      typed: {
        askingSalePriceKrw: (dealResult.data as typeof dealResult.data & { asking_sale_price_krw?: number | null }).asking_sale_price_krw ?? null,
        jeonseDepositKrw: (dealResult.data as typeof dealResult.data & { jeonse_deposit_krw?: number | null }).jeonse_deposit_krw ?? null,
        monthlyRentDepositKrw: (dealResult.data as typeof dealResult.data & { monthly_rent_deposit_krw?: number | null }).monthly_rent_deposit_krw ?? null,
        monthlyRentAmountKrw: (dealResult.data as typeof dealResult.data & { monthly_rent_amount_krw?: number | null }).monthly_rent_amount_krw ?? null,
        saleListingStatus: (dealResult.data as typeof dealResult.data & { sale_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null }).sale_listing_status ?? null,
        jeonseListingStatus: (dealResult.data as typeof dealResult.data & { jeonse_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null }).jeonse_listing_status ?? null,
        monthlyRentListingStatus: (dealResult.data as typeof dealResult.data & { monthly_rent_listing_status?: "NOT_LISTED" | "PREPARING" | "LISTED" | "PAUSED" | null }).monthly_rent_listing_status ?? null,
      },
    },
  };
}

export async function loadActiveCounselors(
  projectId: string,
): Promise<{ error: true } | { error: false; counselors: string[] }> {
  const supabase = await createServerClient();
  const result = await supabase
    .from("project_member")
    .select("id")
    .eq("project_id", projectId)
    .eq("active", true)
    .eq("role", "COUNSELOR");

  if (result.error) return { error: true };
  return {
    error: false,
    counselors: (result.data ?? []).map((row) => row.id),
  };
}

export type FieldMemberName = {
  memberId: string;
  displayName: string | null;
};

// list_move_in_field_members는 화양 공유현장에서만 값을 반환한다(private.is_hwayang_field_member 가드).
// 다른 프로젝트는 항상 빈 배열이며, 이때 상담사 배정 화면은 "이름 미등록"으로 표시한다.
export async function loadFieldMemberNames(
  projectId: string,
): Promise<{ error: true } | { error: false; members: FieldMemberName[] }> {
  const supabase = await createServerClient();
  const result = await supabase.rpc("list_move_in_field_members", {
    p_project_id: projectId,
  });

  if (result.error) return { error: true };
  return {
    error: false,
    members: (result.data ?? []).map((row) => ({
      memberId: row.member_id,
      displayName: row.display_name,
    })),
  };
}

export type MemberProject = {
  id: string;
  name: string;
  role: Database["public"]["Enums"]["project_member_role"];
};

export async function loadMemberProjects(): Promise<
  | { ok: false; kind: "unauthenticated" | "unavailable" }
  | { ok: true; projects: MemberProject[] }
> {
  const supabase = await createServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, kind: "unauthenticated" };
  }

  const { data: memberships, error } = await supabase
    .from("project_member")
    .select("role, project_id")
    .eq("user_id", userData.user.id)
    .eq("active", true);

  if (error) return { ok: false, kind: "unavailable" };

  const projectIds = [...new Set((memberships ?? []).map((row) => row.project_id))];
  if (projectIds.length === 0) return { ok: true, projects: [] };

  const projectsResult = await supabase
    .from("project")
    .select("id, name")
    .in("id", projectIds);

  if (projectsResult.error) return { ok: false, kind: "unavailable" };

  const nameById = new Map(
    (projectsResult.data ?? []).map((project) => [project.id, project.name]),
  );

  const projects: MemberProject[] = [];
  for (const row of memberships ?? []) {
    if (row.role !== "COUNSELOR" && row.role !== "PROJECT_ADMIN" && row.role !== "CLIENT_MANAGER") continue;
    const name = nameById.get(row.project_id);
    if (!name) continue;
    projects.push({ id: row.project_id, name, role: row.role });
  }

  return { ok: true, projects };
}

export async function loadProjectMembers(
  projectId: string,
): Promise<{ members: ProjectMemberRow[]; error: true } | { members: ProjectMemberRow[]; error: false }> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok || access.role !== "PROJECT_ADMIN") return { members: [], error: true };

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("list_project_members", { p_project_id: projectId });
  if (error || !data) return { members: [], error: true };

  const members: ProjectMemberRow[] = data.map((row) => ({
    memberId: row.member_id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
  }));

  return { members, error: false };
}


export type MoveInTodayQueueSourceRow = {
  unitId: string;
  contractId: string;
  legacyGrade: string | null;
  occupancyIntent: string | null;
  fundingStatus: string | null;
  moveInStatus: string | null;
  lastContactAt: string | null;
  nextContactAt: string | null;
  reasonCodes: string[];
  problemCategories: string[];
  priority: string;
  sourceFingerprint: string;
};

export type MoveInTodayQueueRow = MoveInTodayQueueSourceRow & {
  buildingNo: string | null;
  unitNo: string | null;
  customerName: string | null;
  operationalIntent: import("@/lib/move-in/labels").OperationalIntent | null;
  operationalIntentAsOf: string | null;
};

/** Queue enrichment is bounded to current Queue units, never the full unit list. */
export function currentQueueUnitIds(queueRows: MoveInTodayQueueSourceRow[]): string[] {
  return [...new Set(queueRows.map((row) => row.unitId))];
}

type TodayQueueRpcRow = {
  unit_id: string;
  contract_id: string;
  legacy_grade: string | null;
  occupancy_intent: string | null;
  funding_status: string | null;
  move_in_status: string | null;
  last_contact_at: string | null;
  next_contact_at: string | null;
  reason_codes: string[] | null;
  problem_categories: string[] | null;
  priority: string;
  source_fingerprint: string;
};

type TodayQueueCurrentUnitProjection = {
  unit_id: string;
  building_no: string;
  unit_no: string;
  occupancy: (Pick<OccupancyRow, "operational_intent" | "operational_intent_as_of"> & {
    contract: {
      contract_id: string;
      holder: { name: string; assigned_counselor_id: string | null } | null;
    } | null;
  }) | null;
};

async function loadCurrentQueueUnitRows(
  projectId: string,
  unitIds: string[],
  access: Awaited<ReturnType<typeof requireMoveInAccess>> & { ok: true },
): Promise<
  | { error: true; rows: [] }
  | { error: false; rows: Array<Pick<UnitListRow, "unitId" | "currentContractId" | "customerName" | "operationalIntent" | "operationalIntentAsOf"> & { buildingNo: string; unitNo: string }> }
> {
  if (unitIds.length === 0) return { error: false, rows: [] };

  const supabase = await createServerClient();
  const current = await readByIds(unitIds, (ids, from, to) => supabase.from("project_unit").select(`
    unit_id,building_no,unit_no,
    occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
      operational_intent,operational_intent_as_of,
      contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
        contract_id,holder:customer!contract_customer_id_project_id_fkey(name,assigned_counselor_id)))
  `).eq("project_id", projectId).in("unit_id", ids).order("unit_id").range(from, to)
    .returns<TodayQueueCurrentUnitProjection[]>());
  if (current.error) return { error: true, rows: [] };

  return {
    error: false,
    rows: current.data
      .filter((unit) => !usesAssignedCustomerScope(projectId, access.role)
        || unit.occupancy?.contract?.holder?.assigned_counselor_id === access.memberId)
      .map((unit) => ({
        unitId: unit.unit_id,
        buildingNo: unit.building_no,
        unitNo: unit.unit_no,
        currentContractId: unit.occupancy?.contract?.contract_id ?? null,
        customerName: unit.occupancy?.contract?.holder?.name ?? null,
        operationalIntent: unit.occupancy?.operational_intent ?? null,
        operationalIntentAsOf: unit.occupancy?.operational_intent_as_of ?? null,
      })),
  };
}

/** Pure server-side pair: a stale contract never receives a current holder's intent. */
export function joinMoveInTodayQueueRows(
  queueRows: MoveInTodayQueueSourceRow[],
  currentRows: Array<Pick<UnitListRow, "unitId" | "currentContractId" | "customerName" | "operationalIntent" | "operationalIntentAsOf"> & { buildingNo?: string | null; unitNo?: string | null }>,
): MoveInTodayQueueRow[] {
  const currentByUnitAndContract = new Map(
    currentRows
      .filter((row) => Boolean(row.currentContractId))
      .map((row) => [`${row.unitId}:${row.currentContractId}`, row]),
  );
  return queueRows.map((queue) => {
    const current = currentByUnitAndContract.get(`${queue.unitId}:${queue.contractId}`);
    return {
      ...queue,
      buildingNo: current?.buildingNo ?? null,
      unitNo: current?.unitNo ?? null,
      customerName: current?.customerName ?? null,
      operationalIntent: current?.operationalIntent ?? null,
      operationalIntentAsOf: current?.operationalIntentAsOf ?? null,
    };
  });
}

/** This only narrows rows already produced and ordered by the authoritative Queue function. */
export function filterTodayQueueRows<T extends Pick<MoveInTodayQueueRow, "reasonCodes" | "moveInStatus">>(
  rows: T[],
  filter: import("@/lib/move-in/filters").TodayFilter,
): T[] {
  if (filter === "all") return rows;
  return rows.filter((row) => {
    if (filter === "next_contact") return row.reasonCodes.includes("FOLLOW_UP_DUE");
    if (filter === "funding") return row.reasonCodes.includes("C_GRADE_FUNDING");
    return row.moveInStatus === "DELAYED";
  });
}

/**
 * Calls the unchanged SQL Queue function, then enriches each row only when the
 * queue contract remains the currently authorized active contract for its unit.
 */
export async function loadMoveInTodayQueueRows(projectId: string, now = new Date()): Promise<
  { error: true; rows: MoveInTodayQueueRow[] } | { error: false; rows: MoveInTodayQueueRow[] }
> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { error: true, rows: [] };
  const supabase = await createServerClient();
  const queueClient = supabase as unknown as {
    rpc: (name: "get_move_in_today_queue", args: { p_project_id: string; p_now: string }) => Promise<{
      data: TodayQueueRpcRow[] | null;
      error: unknown;
    }>;
  };
  const queueResult = await queueClient.rpc("get_move_in_today_queue", { p_project_id: projectId, p_now: now.toISOString() });
  if (queueResult.error || !queueResult.data) return { error: true, rows: [] };
  const source = queueResult.data.map((row): MoveInTodayQueueSourceRow => ({
    unitId: row.unit_id,
    contractId: row.contract_id,
    legacyGrade: row.legacy_grade,
    occupancyIntent: row.occupancy_intent,
    fundingStatus: row.funding_status,
    moveInStatus: row.move_in_status,
    lastContactAt: row.last_contact_at,
    nextContactAt: row.next_contact_at,
    reasonCodes: row.reason_codes ?? [],
    problemCategories: row.problem_categories ?? [],
    priority: row.priority,
    sourceFingerprint: row.source_fingerprint,
  }));
  const currentResult = await loadCurrentQueueUnitRows(projectId, currentQueueUnitIds(source), access);
  if (currentResult.error) return { error: true, rows: [] };
  return { error: false, rows: joinMoveInTodayQueueRows(source, currentResult.rows) };
}
