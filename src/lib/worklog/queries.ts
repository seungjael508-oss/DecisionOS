import { createServerClient } from "@/lib/supabase/server";
import { readAllRows } from "@/lib/supabase/read-all";
import { compareTimestampThenId, readByUuidRanges } from "@/lib/supabase/read-by-uuid-range";
import type { Database } from "@/lib/supabase/types";
import { loadMarketRows } from "@/lib/market/queries";
import { extractLegacyGrade, confirmedLegacyVisitKey } from "@/lib/move-in/consultation";
import { HWAYANG_SHARED_PROJECT_ID } from "@/lib/move-in/field-access";
import {
  isWorklogDateYmd,
  resolveWorklogTimeZone,
  todayYmd,
  worklogDayRange,
} from "@/lib/worklog/day-range";
import {
  buildMoveInWorklogSnapshot,
  type MoveInWorklogSnapshot,
} from "@/lib/worklog/snapshot";

export const WORKLOG_QUERY_TABLES = [
  "project",
  "project_unit",
  "unit_occupancy_status",
  "consultation",
  "contract",
  "market_data",
  "customer",
  "contract_status_history",
] as const;

// counselor_id/content(원문 상담내용)은 화양 3인 실시간 업무일지에서만 선택한다.
// 두 SELECT 문자열을 하나의 삼항연산자로 합치면 postgrest-js의 리터럴 파싱이 깨지므로
// (select() 인자는 단일 문자열 리터럴이어야 함), 아래에서 완전히 분리된 쿼리로 나눈다.
type ConsultationRawRow = Pick<
  Database["public"]["Tables"]["consultation"]["Row"],
  "id" | "unit_id" | "customer_id" | "consulted_at" | "contact_type" | "channel" | "purpose" | "structured_tags" | "next_action_at"
> &
  Partial<Pick<Database["public"]["Tables"]["consultation"]["Row"], "counselor_id" | "content">>;

export function worklogSourceFilter(projectId: string) {
  return {
    project: { table: "project" as const, eq: { id: projectId } },
    units: { table: "project_unit" as const, eq: { project_id: projectId } },
    occupancy: {
      table: "unit_occupancy_status" as const,
      eq: { project_id: projectId },
    },
    consultations: {
      table: "consultation" as const,
      eq: { project_id: projectId },
    },
    contracts: { table: "contract" as const, eq: { project_id: projectId } },
    market: { table: "market_data" as const, eq: { project_id: projectId } },
    fundingHistory: { table: "contract_status_history" as const, eq: { project_id: projectId } },
  };
}

type ServerSupabase = Awaited<ReturnType<typeof createServerClient>>;

// 상담 이력: 예전에는 consulted_at 순서 1000행 페이지 4개를 직렬로 읽었다(각 페이지가 프로젝트 전체 행에 RLS 재평가).
// unit_id 구간 8개 + 세대 미지정 1개를 동시에 읽고, 원래 순서(consulted_at, id)로 다시 정렬한다. 행 집합은 같다.
async function readWorklogConsultations(supabase: ServerSupabase, projectId: string, endIso: string, isHwayangSharedField: boolean) {
  // 화양이 아니면 필요 없는 원문 상담내용(content)을 서버로 끌어오지 않도록 select 자체를 분리한다.
  const select = () => (isHwayangSharedField
    ? supabase.from("consultation").select("id, unit_id, customer_id, consulted_at, contact_type, channel, purpose, structured_tags, next_action_at, counselor_id, content")
    : supabase.from("consultation").select("id, unit_id, customer_id, consulted_at, contact_type, channel, purpose, structured_tags, next_action_at"))
    .eq("project_id", projectId).lt("consulted_at", endIso);
  const [withUnit, withoutUnit] = await Promise.all([
    readByUuidRanges<ConsultationRawRow>(({ lower, upper }, from, to) => {
      const query = select().gte("unit_id", lower);
      return (upper ? query.lt("unit_id", upper) : query).order("unit_id").order("consulted_at").order("id").range(from, to);
    }),
    readAllRows<ConsultationRawRow>((from, to) => select().is("unit_id", null).order("consulted_at").order("id").range(from, to), 1000),
  ]);
  if (withUnit.error || withoutUnit.error) return { data: [] as ConsultationRawRow[], error: true };
  const rows = [...withUnit.data, ...withoutUnit.data];
  rows.sort((a, b) => compareTimestampThenId({ at: a.consulted_at, id: a.id }, { at: b.consulted_at, id: b.id }));
  return { data: rows, error: false };
}

export type WorklogLoadResult =
  | { error: true }
  | { error: false; snapshot: MoveInWorklogSnapshot; refreshedAt: string };

export async function loadMoveInWorklog(
  projectId: string,
  requestedDate: string | null,
): Promise<WorklogLoadResult> {
  try {
    const supabase = await createServerClient();

    const projectResult = await supabase
      .from("project")
      .select("timezone")
      .eq("id", projectId)
      .maybeSingle();

    if (projectResult.error || !projectResult.data) {
      return { error: true };
    }

    const timeZone = resolveWorklogTimeZone(projectResult.data.timezone);
    const dateYmd =
      requestedDate && isWorklogDateYmd(requestedDate)
        ? requestedDate
        : todayYmd(timeZone);
    const range = worklogDayRange(dateYmd, timeZone);

    const isHwayangSharedField = projectId === HWAYANG_SHARED_PROJECT_ID;

    // 851행 테이블은 1000행 1페이지. count=exact는 행마다 RLS 평가를 한 번 더 하므로 쓰지 않는다.
    const [unitsResult, occupancyResult, consultationResult, contractsResult, marketResult, customersResult, fieldMembersResult, fundingHistoryResult] = await Promise.all([
      readAllRows((from, to) => supabase
        .from("project_unit")
        .select("unit_id, building_no, unit_no, unit_type")
        .eq("project_id", projectId).order("unit_id").range(from, to), 1000),
      readAllRows((from, to) => supabase
        .from("unit_occupancy_status")
        .select(
          "unit_id, contract_id, occupancy_intent, funding_status, move_in_status, legacy_grade, balance_paid_at, actual_move_in_date, planned_move_in_date, next_contact_at",
        )
        .eq("project_id", projectId).order("unit_id").range(from, to), 1000),
      readWorklogConsultations(supabase, projectId, range.endIso, isHwayangSharedField),
      readAllRows((from, to) => supabase.from("contract")
        .select("contract_id, unit_id, customer_id, contract_status, contracted_at")
        .eq("project_id", projectId).order("contract_id").range(from, to), 1000),
      loadMarketRows(projectId, range.endIso).catch(() => ({ error: true as const, rows: [] })),
      readAllRows((from, to) => supabase.from("customer").select("id, phone_quality").eq("project_id", projectId).order("id").range(from,to), 1000),
      // 화양이 아니면 RPC가 항상 빈 배열을 반환하므로(private.is_hwayang_field_member 가드),
      // 팀 실적/등급변경/상담 상세 섹션은 화양에서만 계산된다.
      isHwayangSharedField ? supabase.rpc("list_move_in_field_members", { p_project_id: projectId }) : Promise.resolve({ data: [], error: null }),
      readAllRows((from, to) => supabase.from("contract_status_history")
        .select("unit_id, contract_id, changed_at, previous_value, new_value, field_changed", { count: "exact" })
        .eq("project_id", projectId).eq("field_changed", "funding_status")
        .gte("changed_at", range.startIso).lt("changed_at", range.endIso)
        .order("changed_at").range(from, to)),
    ]);

    if (unitsResult.error || occupancyResult.error || consultationResult.error || contractsResult.error || fundingHistoryResult.error) {
      return { error: true };
    }

    // Audited F003 visit worksheet: 29 valid events at rows 2–30.
    // Read projection: current Hwayang operations classify other legacy consultations as CALL.
    // Never infer a channel from purpose or rewrite the source.
    const unitIds = new Set(unitsResult.data.map(row => row.unit_id));
    const keyCounts = new Map<string, number>();
    for (const row of consultationResult.data) {
      const tags = row.structured_tags;
      if (tags && typeof tags === "object" && !Array.isArray(tags) && typeof tags.legacy_source_key === "string") {
        const key = tags.legacy_source_key;
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
      }
    }
    const projectedContactType = (row: (typeof consultationResult.data)[number]) => {
      const key = confirmedLegacyVisitKey(projectId, row.structured_tags);
      return projectId === "1283e198-5043-4027-96d6-edcc7a6686c6" &&
        row.contact_type === "CONSULTATION" && row.channel === "LEGACY_IMPORT" &&
        row.unit_id !== null && unitIds.has(row.unit_id) && key !== null && keyCounts.get(key) === 1
        ? "VISIT" : projectId === "1283e198-5043-4027-96d6-edcc7a6686c6" && row.channel === "LEGACY_IMPORT" && row.contact_type === "CONSULTATION" && row.unit_id !== null && unitIds.has(row.unit_id) ? "CALL" : row.contact_type;
    };

    const holderContracts = contractsResult.data.filter(c => c.contract_status === "ACTIVE" || c.contract_status === "COMPLETED");
    const phoneByCustomer = new Map(customersResult.data.map(c => [c.id,c.phone_quality]));
    const phonesComplete = !customersResult.error && holderContracts.every(c => phoneByCustomer.has(c.customer_id));
    const snapshot = buildMoveInWorklogSnapshot(
      (unitsResult.data ?? []).map((row) => ({
        unitId: row.unit_id,
        buildingNo: row.building_no,
        unitType: row.unit_type,
        unitNo: row.unit_no,
      })),
      (occupancyResult.data ?? []).map((row) => ({
        unitId: row.unit_id,
        occupancyIntent: row.occupancy_intent,
        contractId: row.contract_id,
        fundingStatus: row.funding_status,
        moveInStatus: row.move_in_status,
        balancePaidAt: row.balance_paid_at,
        actualMoveInDate: row.actual_move_in_date,
        plannedMoveInDate: row.planned_move_in_date,
        nextContactAt: row.next_contact_at,
      })),
      (consultationResult.data ?? []).map((row) => ({
        id: row.id,
        consultedAt: row.consulted_at,
        contactType: projectedContactType(row),
        unitId: row.unit_id,
        legacyGrade: extractLegacyGrade(row.structured_tags),
        customerId: row.customer_id,
        purpose: row.purpose,
        nextActionAt: row.next_action_at,
        counselorId: row.counselor_id,
        content: row.content,
      })),
      range,
      {
        phoneQualities: phonesComplete ? holderContracts.map(c => ({unitId:c.unit_id, invalid:phoneByCustomer.get(c.customer_id) === "PHONE_INVALID"})) : undefined,
        contracts: contractsResult.data.map(row => ({ unitId: row.unit_id, status: row.contract_status, contractedAt: row.contracted_at })),
        currentUnitSnapshot: (() => {
          const activeByUnit = new Map<string, typeof contractsResult.data>();
          for (const row of contractsResult.data) if (row.contract_status === "ACTIVE") activeByUnit.set(row.unit_id, [...(activeByUnit.get(row.unit_id) ?? []), row]);
          return (occupancyResult.data ?? []).flatMap((occupancy) => {
            const active = activeByUnit.get(occupancy.unit_id) ?? [];
            if (active.length !== 1 || occupancy.contract_id !== active[0].contract_id) return [];
            return [{ unitId: occupancy.unit_id, contractId: active[0].contract_id, customerId: active[0].customer_id, fundingStatus: occupancy.funding_status, currentGrade: occupancy.legacy_grade }];
          });
        })(),
        fundingHistory: (fundingHistoryResult.data ?? []).map(row => ({ unitId: row.unit_id, contractId: row.contract_id, changedAt: row.changed_at, previousValue: row.previous_value, newValue: row.new_value, fieldChanged: row.field_changed })),
        currentSnapshotAsOf: new Date().toISOString(),
        marketRows: marketResult.rows,
        marketError: marketResult.error,
        ...(isHwayangSharedField && !fieldMembersResult.error ? {
          fieldMembers: (fieldMembersResult.data ?? []).map((row) => ({ memberId: row.member_id, displayName: row.display_name })),
        } : {}),
      },
    );

    return { error: false, snapshot, refreshedAt: new Date().toISOString() };
  } catch {
    return { error: true };
  }
}
