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
  customerName: string | null;
  customerPhone: string | null;
  occupancy: OccupancyRow | null;
  relatedUnits: RelatedHolderUnit[];
};

export type ConsultationHistoryRow = {
  id: string;
  consultedAt: string;
  contactType: string | null;
  content: string;
  nextActionAt: string | null;
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
      const customerResult = await supabase
        .from("customer")
        .select("name, phone")
        .eq("project_id", projectId)
        .eq("id", contractResult.data.customer_id)
        .maybeSingle();

      if (customerResult.error) return { kind: "error" };
      customerName = customerResult.data?.name ?? null;
      customerPhone = customerResult.data?.phone ?? null;

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
    .select("id, consulted_at, contact_type, content, next_action_at")
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
      occupancy,
      customerId,
      relatedUnits,
    },
    consultations: (consultationResult.data ?? []).map((row) => ({
      id: row.id,
      consultedAt: row.consulted_at,
      contactType: row.contact_type,
      content: row.content,
      nextActionAt: row.next_action_at,
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
