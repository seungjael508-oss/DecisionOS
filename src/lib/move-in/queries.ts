import {
  sortCallRows,
  type CallListRow,
} from "@/lib/move-in/calls";
import { extractLegacyGrade } from "@/lib/move-in/consultation";
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
  legacyGrade: string | null;
};

export async function loadUnitRows(
  projectId: string,
): Promise<{ rows: UnitListRow[]; error: true } | { rows: UnitListRow[]; error: false }> {
  const supabase = await createServerClient();

  const [unitsResult, occupancyResult] = await Promise.all([
    supabase
      .from("project_unit")
      .select("unit_id, building_no, unit_no")
      .eq("project_id", projectId),
    supabase
      .from("unit_occupancy_status")
      .select(
        "unit_id, contract_id, occupancy_intent, funding_status, move_in_status, balance_paid_at, actual_move_in_date, planned_move_in_date, last_contact_at, next_contact_at",
      )
      .eq("project_id", projectId),
  ]);

  if (unitsResult.error || occupancyResult.error) {
    return { rows: [], error: true };
  }

  const occupancyByUnit = new Map(
    (occupancyResult.data ?? []).map((row) => [row.unit_id, row]),
  );
  const contractIds = [
    ...new Set((occupancyResult.data ?? []).map((row) => row.contract_id)),
  ];

  const customerByContract = new Map<string, string | null>();
  if (contractIds.length > 0) {
    const contractsResult = await supabase
      .from("contract")
      .select("contract_id, customer_id")
      .eq("project_id", projectId)
      .in("contract_id", contractIds);

    if (contractsResult.error) {
      return { rows: [], error: true };
    }

    const customerIds = [
      ...new Set((contractsResult.data ?? []).map((row) => row.customer_id)),
    ];
    const customersResult =
      customerIds.length === 0
        ? { data: [] as { id: string; name: string }[], error: null }
        : await supabase
            .from("customer")
            .select("id, name")
            .eq("project_id", projectId)
            .in("id", customerIds);

    if (customersResult.error) {
      return { rows: [], error: true };
    }

    const nameById = new Map(
      (customersResult.data ?? []).map((row) => [row.id, row.name]),
    );
    for (const contract of contractsResult.data ?? []) {
      customerByContract.set(
        contract.contract_id,
        nameById.get(contract.customer_id) ?? null,
      );
    }
  }

  const rows: UnitListRow[] = (unitsResult.data ?? []).map((unit) => {
    const occupancy = occupancyByUnit.get(unit.unit_id);
    return {
      unitId: unit.unit_id,
      buildingNo: unit.building_no,
      unitNo: unit.unit_no,
      customerName: occupancy
        ? (customerByContract.get(occupancy.contract_id) ?? null)
        : null,
      occupancyIntent: occupancy?.occupancy_intent ?? null,
      fundingStatus: occupancy?.funding_status ?? null,
      moveInStatus: occupancy?.move_in_status ?? null,
      balancePaidAt: occupancy?.balance_paid_at ?? null,
      actualMoveInDate: occupancy?.actual_move_in_date ?? null,
      plannedMoveInDate: occupancy?.planned_move_in_date ?? null,
      lastContactAt: occupancy?.last_contact_at ?? null,
      nextContactAt: occupancy?.next_contact_at ?? null,
    };
  });

  return { rows: sortUnits(rows), error: false };
}

export async function loadFloorplanRows(
  projectId: string,
): Promise<
  | { rows: FloorplanUnit[]; error: true }
  | { rows: FloorplanUnit[]; error: false }
> {
  const supabase = await createServerClient();

  const [unitsResult, occupancyResult, consultationResult] = await Promise.all([
    supabase
      .from("project_unit")
      .select("unit_id, building_no, unit_no, floor")
      .eq("project_id", projectId),
    supabase
      .from("unit_occupancy_status")
      .select("unit_id, occupancy_intent, funding_status, move_in_status")
      .eq("project_id", projectId),
    supabase
      .from("consultation")
      .select("unit_id, consulted_at, structured_tags")
      .eq("project_id", projectId)
      .order("consulted_at", { ascending: false }),
  ]);

  if (unitsResult.error || occupancyResult.error || consultationResult.error) {
    return { rows: [], error: true };
  }

  const occupancyByUnit = new Map(
    (occupancyResult.data ?? []).map((row) => [row.unit_id, row]),
  );
  const latestGradeByUnit = new Map<
    string,
    ReturnType<typeof extractLegacyGrade>
  >();
  for (const row of consultationResult.data ?? []) {
    if (!row.unit_id || latestGradeByUnit.has(row.unit_id)) continue;
    latestGradeByUnit.set(row.unit_id, extractLegacyGrade(row.structured_tags));
  }

  const rows: FloorplanUnit[] = (unitsResult.data ?? []).map((unit) => {
    const occupancy = occupancyByUnit.get(unit.unit_id);
    return {
      unitId: unit.unit_id,
      buildingNo: unit.building_no,
      unitNo: unit.unit_no,
      floor: unit.floor,
      occupancyIntent: occupancy?.occupancy_intent ?? null,
      fundingStatus: occupancy?.funding_status ?? null,
      moveInStatus: occupancy?.move_in_status ?? null,
      latestGrade: latestGradeByUnit.get(unit.unit_id) ?? null,
    };
  });

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
        .select("name, phone, assigned_counselor_id")
        .eq("project_id", projectId)
        .eq("id", contractResult.data.customer_id)
        .maybeSingle();

      if (customerResult.error) return { kind: "error" };
      customerName = customerResult.data?.name ?? null;
      customerPhone = customerResult.data?.phone ?? null;
      assignedCounselorId = customerResult.data?.assigned_counselor_id ?? null;

      const siblingContracts = await supabase
        .from("contract")
        .select("unit_id, contract_status")
        .eq("project_id", projectId)
        .eq("customer_id", customerId)
        .in("contract_status", ["ACTIVE", "COMPLETED"]);

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

  const consultationResult = await supabase
    .from("consultation")
    .select(
      "id, consulted_at, contact_type, purpose, content, next_action_at, counselor_id, structured_tags",
    )
    .eq("project_id", projectId)
    .eq("unit_id", unitId)
    .order("consulted_at", { ascending: false });

  if (consultationResult.error) return { kind: "error" };

  return {
    kind: "ok",
    detail: {
      unitId: unitResult.data.unit_id,
      buildingNo: unitResult.data.building_no,
      unitNo: unitResult.data.unit_no,
      customerName,
      customerPhone,
      assignedCounselorId,
      occupancy,
      customerId,
      contractId,
      relatedUnits,
    },
    consultations: (consultationResult.data ?? []).map((row) => ({
      id: row.id,
      consultedAt: row.consulted_at,
      contactType: row.contact_type,
      purpose: row.purpose,
      content: row.content,
      nextActionAt: row.next_action_at,
      counselorId: row.counselor_id,
      legacyGrade: extractLegacyGrade(row.structured_tags),
    })),
  };
}

export async function loadCallRows(
  projectId: string,
): Promise<{ rows: CallListRow[]; error: true } | { rows: CallListRow[]; error: false }> {
  const supabase = await createServerClient();

  const customersResult = await supabase
    .from("customer")
    .select("id, name, phone, phone_normalized, assigned_counselor_id")
    .eq("project_id", projectId);

  if (customersResult.error) return { rows: [], error: true };

  const customers = customersResult.data ?? [];
  if (customers.length === 0) return { rows: [], error: false };

  const customerIds = customers.map((row) => row.id);
  const customerById = new Map(customers.map((row) => [row.id, row]));

  const contractsResult = await supabase
    .from("contract")
    .select("contract_id, unit_id, customer_id")
    .eq("project_id", projectId)
    .eq("contract_status", "ACTIVE")
    .in("customer_id", customerIds);

  if (contractsResult.error) return { rows: [], error: true };

  const contracts = contractsResult.data ?? [];
  if (contracts.length === 0) return { rows: [], error: false };

  const unitIds = [...new Set(contracts.map((row) => row.unit_id))];
  const contractByUnit = new Map(contracts.map((row) => [row.unit_id, row]));

  const [unitsResult, occupancyResult, consultationResult] = await Promise.all([
    supabase
      .from("project_unit")
      .select("unit_id, building_no, unit_no")
      .eq("project_id", projectId)
      .in("unit_id", unitIds),
    supabase
      .from("unit_occupancy_status")
      .select(
        "unit_id, occupancy_intent, funding_status, move_in_status, next_contact_at",
      )
      .eq("project_id", projectId)
      .in("unit_id", unitIds),
    supabase
      .from("consultation")
      .select("unit_id, consulted_at, structured_tags")
      .eq("project_id", projectId)
      .in("unit_id", unitIds)
      .order("consulted_at", { ascending: false }),
  ]);

  if (unitsResult.error || occupancyResult.error || consultationResult.error) {
    return { rows: [], error: true };
  }

  const occupancyByUnit = new Map(
    (occupancyResult.data ?? []).map((row) => [row.unit_id, row]),
  );
  const latestConsultationByUnit = new Map<
    string,
    { consultedAt: string; grade: ReturnType<typeof extractLegacyGrade> }
  >();
  for (const row of consultationResult.data ?? []) {
    if (!row.unit_id || latestConsultationByUnit.has(row.unit_id)) continue;
    latestConsultationByUnit.set(row.unit_id, {
      consultedAt: row.consulted_at,
      grade: extractLegacyGrade(row.structured_tags),
    });
  }

  const rows: CallListRow[] = (unitsResult.data ?? []).flatMap((unit) => {
    const contract = contractByUnit.get(unit.unit_id);
    if (!contract) return [];
    const customer = customerById.get(contract.customer_id);
    if (!customer) return [];
    const occupancy = occupancyByUnit.get(unit.unit_id);
    const latest = latestConsultationByUnit.get(unit.unit_id);
    return [
      {
        unitId: unit.unit_id,
        buildingNo: unit.building_no,
        unitNo: unit.unit_no,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        phoneNormalized: customer.phone_normalized,
        assignedCounselorId: customer.assigned_counselor_id,
        latestGrade: latest?.grade ?? null,
        occupancyIntent: occupancy?.occupancy_intent ?? null,
        fundingStatus: occupancy?.funding_status ?? null,
        moveInStatus: occupancy?.move_in_status ?? null,
        lastConsultedAt: latest?.consultedAt ?? null,
        nextContactAt: occupancy?.next_contact_at ?? null,
      },
    ];
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
