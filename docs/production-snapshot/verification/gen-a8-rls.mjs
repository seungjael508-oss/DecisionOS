// A8(조회 RLS 반복 평가 제거) 마이그레이션·롤백 생성기.
// 입력: a8-policies-original.json(운영 스키마 조립본에서 추출한 대상 SELECT 정책 원문·md5·명령·역할·PERMISSIVE)
// 대상: 2026-10-19 운영 EXPLAIN ANALYZE(상담사 권한)에서 비용이 확인된 테이블의 SELECT 정책 7개만(그 밖의 정책은 바꾸지 않는다)
// 출력: supabase/migrations/20261019120000_rls_membership_set.sql, supabase/rollback/...rollback.sql
// 권한 의미는 바꾸지 않는다. private.current_project_member_id와 같은 조건(현재 사용자·active·ACTIVE 프로젝트/조직·허용 역할)의
// 소속 목록을 쿼리당 한 번 구하고(uncorrelated subquery → hashed SubPlan), 정책은 그 목록과 비교한다.
// project_member(project_id, user_id) UNIQUE 이므로 프로젝트당 멤버 행은 최대 1개 → 기존 함수 결과와 같다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const original = JSON.parse(fs.readFileSync(path.join(here, "a8-policies-original.json"), "utf8"));
const NAME = "20261019120000_rls_membership_set";
const STAYJ = "1283e198-5043-4027-96d6-edcc7a6686c6";

const roles = (...r) => `array[${r.map((x) => `'${x}'`).join(", ")}]::public.project_member_role[]`;
const M = "private.current_project_memberships()";
const H = (col, ...r) => `(${col} in (select m.project_id from ${M} m where m.role = any (${roles(...r)})))`;
const C = (pcol, acol) => `((${pcol}, ${acol}) in (select m.project_id, m.member_id from ${M} m where m.role = 'COUNSELOR'::public.project_member_role))`;
const W = (col) => `((${col} = '${STAYJ}'::uuid) and (${col} in (select m.project_id from ${M} m)))`;
const H3 = (col) => H(col, "COUNSELOR", "PROJECT_ADMIN", "CLIENT_MANAGER");
const H2 = (col) => H(col, "COUNSELOR", "PROJECT_ADMIN");
const HA = (col) => H(col, "PROJECT_ADMIN");

const assigned = (tbl) => `(exists (select 1 from public.customer c where c.id = ${tbl}.customer_id and c.project_id = ${tbl}.project_id and ${C(`${tbl}.project_id`, "c.assigned_counselor_id")}))`;
const NEXT = {
  consultation_select: `(${HA("project_id")} or ${assigned("consultation")})`,
  consultation_hwayang_field_select: W("project_id"),
  customer_select: `(${C("project_id", "assigned_counselor_id")} or ${HA("project_id")})`,
  customer_hwayang_field_select: W("project_id"),
  project_unit_select: H3("project_id"),
  contract_select: H3("project_id"),
  unit_occupancy_status_select: H3("project_id"),
};
if (original.length !== Object.keys(NEXT).length || original.some((o) => !NEXT[o.p])) throw new Error("정책 목록 불일치");

const list = original.map((o) => `('${o.t}','${o.p}','${o.h}')`).join(",\n    ");
const preflight = (expectNew) => `do $preflight$
declare
  v_bad text;
begin
  -- 대상 정책 ${original.length}개의 현재 조건이 ${expectNew ? "A8 적용 상태" : "운영 원문(2026-10-19 스키마 조립본)"}와 같아야 한다(다르면 아무것도 바꾸지 않고 중단)
  select string_agg(e.p, ', ') into v_bad
  from (values
    ${expectNew ? original.map((o) => `('${o.t}','${o.p}')`).join(",\n    ") : list}
  ) as e(t, p${expectNew ? "" : ", h"})
  left join pg_policies pp on pp.schemaname = 'public' and pp.tablename = e.t and pp.policyname = e.p
  where pp.policyname is null
     or pp.cmd <> 'SELECT' or pp.permissive <> 'PERMISSIVE' or pp.roles::text <> '{authenticated}' or pp.with_check is not null
     or ${expectNew ? `position('private.current_project_memberships()' in pp.qual) = 0` : `md5(pp.qual) <> e.h`};
  if v_bad is not null then
    raise exception 'policy definition is not the expected ${expectNew ? "A8" : "original"} state: %; abort', v_bad;
  end if;
  ${expectNew ? "" : `if to_regprocedure('private.current_project_memberships()') is not null then
    raise exception 'private.current_project_memberships already exists; abort';
  end if;
  -- 소속 판정 조건을 복사하므로 원본 함수가 기대한 정의인지 확인
  if (select md5(prosrc) from pg_proc where oid = 'private.current_project_member_id(uuid,public.project_member_role[])'::regprocedure)
     is distinct from 'c13d451391341afbc7857362c647c12a' then
    raise exception 'private.current_project_member_id is not the expected definition; abort';
  end if;`}
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;`;

const up = `-- 조회 RLS 반복 평가 제거 (Production 미적용, 별도 승인 필요)
-- 원인(2026-10-19 운영 EXPLAIN, 상담사 권한): SELECT 정책의 private.has_project_role / current_project_member_id /
--   is_hwayang_field_member(SECURITY DEFINER, 인라인 불가)가 행마다 project_member·project·organization을 다시 조회
--   → consultation 3,758행 2,631ms, customer 851행 508ms, project_unit·contract·unit_occupancy_status 851행 각 229~247ms,
--     이 테이블들을 읽는 오늘 관리대상 RPC 6,505ms. 비용이 측정된 이 5개 테이블의 SELECT 정책 7개만 바꾼다.
-- 수정: 같은 조건의 "현재 사용자 소속 목록"을 private.current_project_memberships()로 쿼리당 한 번 구하고,
--   대상 SELECT 정책 ${original.length}개의 조건을 그 목록과의 비교로 바꾼다. 정책 이름·역할(authenticated)·PERMISSIVE·명령은 그대로(ALTER POLICY).
-- 권한 의미는 같다: project_member(project_id, user_id) UNIQUE → 프로젝트당 멤버 행 최대 1개이므로
--   has_project_role(p, R) ⇔ p ∈ {소속 중 역할 ∈ R}, assigned = current_project_member_id(p, COUNSELOR) ⇔ (p, assigned) ∈ {COUNSELOR 소속},
--   is_hwayang_field_member(p) ⇔ p = Stay J ∧ p ∈ {소속}.
-- 쓰기 정책·기존 함수·데이터는 바꾸지 않는다. 오늘 관리대상 판정 결과도 같으므로 처리 기록 조건은 없다.
begin;

${preflight(false)}

-- private.current_project_member_id와 같은 조건(프로젝트·역할 인자만 없음). 결과는 현재 사용자 자신의 소속뿐이다.
create function private.current_project_memberships()
returns table(project_id uuid, member_id uuid, role public.project_member_role)
language sql
stable
security definer
set search_path to ''
as $function$
  select pm.project_id, pm.id, pm.role
  from public.project_member as pm
  inner join public.project as p on p.id = pm.project_id
  inner join public.organization as o on o.id = p.organization_id
  where pm.user_id = auth.uid()
    and pm.active = true
    and p.status = 'ACTIVE'::public.project_status
    and o.status = 'ACTIVE'::public.organization_status
    and pm.role in (
      'COUNSELOR'::public.project_member_role,
      'PROJECT_ADMIN'::public.project_member_role,
      'CLIENT_MANAGER'::public.project_member_role
    );
$function$;
revoke all on function private.current_project_memberships() from public, anon, authenticated, service_role;
grant execute on function private.current_project_memberships() to authenticated;

${original.map((o) => `alter policy ${o.p} on public.${o.t} using (${NEXT[o.p]});`).join("\n")}

commit;
`;

const down = `-- ${NAME} 롤백: 대상 SELECT 정책 ${original.length}개를 원문 조건으로 되돌리고 보조 함수를 삭제한다. 데이터 변경 없음.
begin;

${preflight(true)}

${original.map((o) => `alter policy ${o.p} on public.${o.t} using (${o.q});`).join("\n")}

drop function private.current_project_memberships();

commit;
`;
fs.writeFileSync(path.join(root, `supabase/migrations/${NAME}.sql`), up);
fs.writeFileSync(path.join(root, `supabase/rollback/${NAME}.rollback.sql`), down);
console.log(`OK ${NAME}: 정책 ${original.length}개`);
