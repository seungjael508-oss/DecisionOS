import { usesAssignedCustomerScope } from "@/lib/move-in/field-access";
import { requireMoveInAccess } from "@/lib/move-in/access";
import { readAllRows } from '@/lib/supabase/read-all';
import { readByIds } from '@/lib/supabase/read-by-ids';
import {
  sortCallRows,
  type CallListRow,
} from "@/lib/move-in/calls";
import { extractLegacyGrade, confirmedLegacyVisitKey, LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";
import { VALID_HOLDER_CONTRACT_STATUSES } from "@/lib/move-in/labels";
import type { FloorplanUnit } from "@/lib/move-in/floorplan";
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
} from "@/lib/move-in/deals";
import { sortUnits, type UnitListRow } from "@/lib/move-in/filters";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { buildDashboardActivity, computeMoveInKpis, legacyDashboardSnapshot, type DashboardEvent, type DashboardGrade } from "@/lib/move-in/kpis";
import { todayYmd, worklogDayRange } from "@/lib/worklog/day-range";

/** Server-only summary projection: never reads names, phones or consultation content. */
export async function loadDashboard(projectId: string, now = new Date()) {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return {error:true} as const;
  const supabase = await createServerClient();
  const day = worklogDayRange(todayYmd("Asia/Seoul",now),"Asia/Seoul");
  type Unit = {
    unit_id:string; legacy:Array<{unit_id:string}>;
    occupancy:(Pick<OccupancyRow,"occupancy_intent"|"funding_status"|"move_in_status"|"balance_paid_at"|"actual_move_in_date"|"planned_move_in_date"|"next_contact_at"> & {
      contract:{customer_id:string;holder:{assigned_counselor_id:string|null}|null}|null;
    })|null;
  };
  const [units,events] = await Promise.all([
    readAllRows((from,to)=>supabase.from("project_unit").select(`unit_id,
      occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
        occupancy_intent,funding_status,move_in_status,balance_paid_at,actual_move_in_date,planned_move_in_date,next_contact_at,
        contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
          customer_id,holder:customer!contract_customer_id_project_id_fkey(assigned_counselor_id))),
      legacy:consultation!consultation_unit_project_fkey(unit_id)
    `,{count:"exact"}).eq("project_id",projectId)
      .eq("legacy.channel","LEGACY_IMPORT").limit(1,{referencedTable:"legacy"})
      .order("unit_id").range(from,to).returns<Unit[]>()),
    readAllRows((from,to)=>supabase.from("consultation")
      .select("id,unit_id,customer_id,consulted_at,contact_type,channel,next_action_at,legacy_grade:structured_tags->>legacy_grade",{count:"exact"})
      .eq("project_id",projectId)
      .gte("consulted_at",day.startIso).lt("consulted_at",day.endIso).lte("consulted_at",now.toISOString())
      .order("consulted_at").order("id").range(from,to).returns<DashboardEvent[]>()),
  ]);
  if (units.error || events.error) return {error:true} as const;
  const visible = units.data.filter(u=>!usesAssignedCustomerScope(projectId, access.role) || u.occupancy?.contract?.holder?.assigned_counselor_id===access.memberId);
  const visibleById = new Map(visible.map(u=>[u.unit_id,u]));
  const today = events.data.filter(e=>visibleById.has(e.unit_id) && (!usesAssignedCustomerScope(projectId, access.role) || visibleById.get(e.unit_id)?.occupancy?.contract?.customer_id===e.customer_id));
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
  return {error:false,data:{
    date:day.dateYmd, initial:legacyDashboardSnapshot(projectId,access.role),
    totalUnits:visible.length,legacyLinked,sourceReview:visible.length-legacyLinked,
    nextScheduled:visible.filter(u=>u.occupancy?.next_contact_at && Date.parse(u.occupancy.next_contact_at)>=now.getTime()).length,
    activity:buildDashboardActivity(today,baseline,now.toISOString()),
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
  customerId: string | null;
  contractId: string | null;
  customerName: string | null;
  customerPhone: string | null;
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

export async function loadUnitRows(
  projectId: string,
): Promise<{ rows: UnitListRow[]; error: true } | { rows: UnitListRow[]; error: false }> {
  const access = await requireMoveInAccess(projectId);
  if (!access.ok) return { rows: [], error: true };
  const supabase = await createServerClient();
  type ListProjection = {
    unit_id: string; building_no: string; unit_no: string;
    occupancy: (Pick<OccupancyRow, "occupancy_intent" | "funding_status" | "move_in_status" | "balance_paid_at" | "actual_move_in_date" | "planned_move_in_date" | "last_contact_at" | "next_contact_at"> & {
      contract: { customer_id: string; holder: { name: string; phone: string; phone_quality: string | null; assigned_counselor_id: string | null } | null } | null;
    }) | null;
    latest: Array<{ id: string; customer_id: string; consulted_at: string; content: string | null; next_action_at: string | null }>;
    grade: Array<{ customer_id: string; legacy_grade: string }>;
  };
  // Embedded limits apply per unit in PostgreSQL, before history reaches this server.
  const units = await readAllRows((from,to)=>supabase.from("project_unit").select(`
    unit_id, building_no, unit_no,
    occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(
      occupancy_intent,funding_status,move_in_status,balance_paid_at,actual_move_in_date,planned_move_in_date,last_contact_at,next_contact_at,
      contract:contract!unit_occupancy_status_contract_id_project_id_unit_id_fkey(
        customer_id,holder:customer!contract_customer_id_project_id_fkey(name,phone,phone_quality,assigned_counselor_id))),
    latest:consultation!consultation_unit_project_fkey(id,customer_id,consulted_at,content,next_action_at),
    grade:consultation!consultation_unit_project_fkey(customer_id,legacy_grade:structured_tags->>legacy_grade)
  `,{count:"exact"}).eq("project_id",projectId).order("unit_id")
    .order("consulted_at",{referencedTable:"latest",ascending:false}).order("id",{referencedTable:"latest",ascending:false}).limit(1,{referencedTable:"latest"})
    .in("grade.structured_tags->>legacy_grade",[...LEGACY_GRADE_VALUES])
    .order("consulted_at",{referencedTable:"grade",ascending:false}).order("id",{referencedTable:"grade",ascending:false}).limit(1,{referencedTable:"grade"})
    .range(from,to).returns<ListProjection[]>());
  if (units.error) return {rows:[],error:true};
  const visible = units.data.filter(unit => !usesAssignedCustomerScope(projectId, access.role) || unit.occupancy?.contract?.holder?.assigned_counselor_id === access.memberId);
  const gradeByUnit = new Map<string,string>();
  const mismatches = new Map<string,string>();
  for (const unit of visible) {
    const holderId = unit.occupancy?.contract?.customer_id;
    const grade = unit.grade[0];
    if (!holderId || !grade) continue;
    if (grade.customer_id === holderId) gradeByUnit.set(unit.unit_id,grade.legacy_grade);
    else mismatches.set(unit.unit_id,holderId);
  }
  if (mismatches.size) {
    // Exact (unit, current holder) pairs, in bounded batches. No name matching.
    const corrected = await readByIds([...mismatches.keys()], (ids,from,to)=>supabase.from("project_unit")
      .select("unit_id,grade:consultation!consultation_unit_project_fkey(customer_id,legacy_grade:structured_tags->>legacy_grade)")
      .eq("project_id",projectId).in("unit_id",ids)
      .or(ids.map(id=>`and(unit_id.eq.${id},customer_id.eq.${mismatches.get(id)})`).join(","),{referencedTable:"grade"})
      .in("grade.structured_tags->>legacy_grade",[...LEGACY_GRADE_VALUES])
      .order("consulted_at",{referencedTable:"grade",ascending:false}).order("id",{referencedTable:"grade",ascending:false})
      .limit(1,{referencedTable:"grade"}).order("unit_id").range(from,to)
      .returns<Array<{unit_id:string;grade:Array<{customer_id:string;legacy_grade:string}>}>>());
    if (corrected.error) return {rows:[],error:true};
    for (const unit of corrected.data) {
      const grade = unit.grade[0];
      if (grade && grade.customer_id === mismatches.get(unit.unit_id)) gradeByUnit.set(unit.unit_id,grade.legacy_grade);
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
      customerName:holder?.name ?? null, customerPhone:holder?.phone ?? null,phoneQuality:holder?.phone_quality ?? null,
      latestGrade:gradeByUnit.get(unit.unit_id) ?? null,latestConsultation:latest?.content ?? null,
      latestPreviousHolder:Boolean(latest && contract && latest.customer_id !== contract.customer_id),
      occupancyIntent:status?.occupancy_intent ?? null,fundingStatus:status?.funding_status ?? null,moveInStatus:status?.move_in_status ?? null,
      balancePaidAt:status?.balance_paid_at ?? null,actualMoveInDate:status?.actual_move_in_date ?? null,plannedMoveInDate:status?.planned_move_in_date ?? null,
      lastContactAt:latest?.consulted_at ?? status?.last_contact_at ?? null,
      nextContactAt:status ? status.next_contact_at : latest?.next_action_at ?? null,
    });
  }
  return {rows:sortUnits(rows),error:false};
}

export async function loadFloorplanRows(
  projectId: string,
): Promise<
  | { rows: FloorplanUnit[]; error: true }
  | { rows: FloorplanUnit[]; error: false }
> {
  const supabase = await createServerClient();

  // 세대별 최신 상담의 등급만 DB에서 1건으로 제한한다. 원문·전체 태그·History는 전송하지 않는다.
  // 상담사/관리자 데이터 경계는 기존 사용자 Supabase client와 RLS를 그대로 사용한다.
  type Projection = {
    unit_id: string; building_no: string; unit_no: string; floor: number | null;
    occupancy: { occupancy_intent: OccupancyRow["occupancy_intent"]; funding_status: OccupancyRow["funding_status"]; move_in_status: OccupancyRow["move_in_status"] } | null;
    grade: Array<{ legacy_grade: string | null }>;
  };
  const result = await readAllRows((from, to) => supabase.from("project_unit")
    .select(`unit_id,building_no,unit_no,floor,
      occupancy:unit_occupancy_status!unit_occupancy_status_project_id_unit_id_fkey(occupancy_intent,funding_status,move_in_status),
      grade:consultation!consultation_unit_project_fkey(legacy_grade:structured_tags->>legacy_grade)`, { count: "exact" })
    .eq("project_id", projectId).order("unit_id")
    .order("consulted_at", { referencedTable: "grade", ascending: false })
    .order("id", { referencedTable: "grade", ascending: true })
    .limit(1, { referencedTable: "grade" }).range(from, to).returns<Projection[]>());
  if (result.error) return { rows: [], error: true };
  // 최신 상담에 등급이 없으면 기존 동호수표와 동일하게 미등록으로 표시한다.
  const rows: FloorplanUnit[] = result.data.map(unit => ({
    unitId: unit.unit_id, buildingNo: unit.building_no, unitNo: unit.unit_no, floor: unit.floor,
    occupancyIntent: unit.occupancy?.occupancy_intent ?? null,
    fundingStatus: unit.occupancy?.funding_status ?? null,
    moveInStatus: unit.occupancy?.move_in_status ?? null,
    latestGrade: extractLegacyGrade({ legacy_grade: unit.grade[0]?.legacy_grade ?? null }),
  }));

  return { rows, error: false };
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
    .select("unit_id, building_no, unit_no")
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

  if (occupancy) {
    const contractResult = await supabase
      .from("contract")
      .select("customer_id")
      .eq("project_id", projectId)
      .eq("contract_id", occupancy.contract_id)
      .maybeSingle();

    if (contractResult.error) return { kind: "error" };

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
): Promise<{ rows: DealListRow[]; error: true } | { rows: DealListRow[]; error: false }> {
  const list = await loadCallRows(projectId);
  if (list.error) return { rows: [], error: true };

  const supabase = await createServerClient();
  const [dealsResult, linksResult, contractsResult] = await Promise.all([
    supabase
      .from("unit_deal")
      .select(
        "id, unit_id, contract_id, consent_status, deal_status, sale_enabled, jeonse_enabled, monthly_rent_enabled, updated_at",
      )
      .eq("project_id", projectId),
    supabase
      .from("unit_deal_brokerage")
      .select("unit_deal_id, brokerage_office_id"),
    supabase
      .from("contract")
      .select("contract_id, unit_id")
      .eq("project_id", projectId)
      .eq("contract_status", "ACTIVE"),
  ]);

  if (dealsResult.error || linksResult.error || contractsResult.error) {
    return { rows: [], error: true };
  }

  const dealByUnit = new Map(
    (dealsResult.data ?? []).map((row) => [row.unit_id, row]),
  );
  const contractByUnit = new Map(
    (contractsResult.data ?? []).map((row) => [row.unit_id, row.contract_id]),
  );
  const officesByDeal = new Map<string, string[]>();
  for (const link of linksResult.data ?? []) {
    const current = officesByDeal.get(link.unit_deal_id) ?? [];
    current.push(link.brokerage_office_id);
    officesByDeal.set(link.unit_deal_id, current);
  }

  const rows: DealListRow[] = list.rows.flatMap((row) => {
    const deal = dealByUnit.get(row.unitId);
    const contractId = deal?.contract_id ?? contractByUnit.get(row.unitId);
    if (!contractId) return [];
    const officeIds = deal ? (officesByDeal.get(deal.id) ?? []) : [];
    const rawConsent = deal?.consent_status;
    const rawDealStatus = deal?.deal_status;
    const consentStatus = rawConsent && isConsentStatus(rawConsent) ? rawConsent : null;
    const dealStatus = rawDealStatus && isDealStatus(rawDealStatus) ? rawDealStatus : null;
    return [
      {
        ...row,
        contractId,
        consentStatus,
        dealStatus,
        saleEnabled: deal?.sale_enabled ?? false,
        jeonseEnabled: deal?.jeonse_enabled ?? false,
        monthlyRentEnabled: deal?.monthly_rent_enabled ?? false,
        brokerageCount: officeIds.length,
        updatedAt: deal?.updated_at ?? null,
        officeIds,
      },
    ];
  });

  return { rows, error: false };
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
): Promise<{ error: true } | { error: false; deal: UnitDealRecord | null }> {
  const supabase = await createServerClient();
  const dealResult = await supabase
    .from("unit_deal")
    .select(
      "id, consent_status, deal_status, sale_enabled, jeonse_enabled, monthly_rent_enabled, sale_note, jeonse_note, monthly_rent_note, details",
    )
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .maybeSingle();

  if (dealResult.error) return { error: true };
  if (!dealResult.data) return { error: false, deal: null };

  const linksResult = await supabase
    .from("unit_deal_brokerage")
    .select("brokerage_office_id, brokerage_contact_id")
    .eq("unit_deal_id", dealResult.data.id);

  if (linksResult.error) return { error: true };

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
    if (row.role !== "COUNSELOR" && row.role !== "PROJECT_ADMIN") continue;
    const name = nameById.get(row.project_id);
    if (!name) continue;
    projects.push({ id: row.project_id, name, role: row.role });
  }

  return { ok: true, projects };
}
