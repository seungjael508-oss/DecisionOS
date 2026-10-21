-- 장기 부재자 D등급 전환 및 방문상담 관리 (Production 미적용, 별도 승인 필요)
-- 선행: 20261009100000_absent_contact_separation, 20261015100000_today_queue_cd_focus 적용 후에만 실행
-- 1) 연속 부재: 현재 ACTIVE 계약자 본인의 전화(CALL) 부재 기록만, 마지막 실제 접촉(부재 외 상담) 이후 건수
--    (실제 접촉 시 0으로 초기화. 방문 부재 등 전화가 아닌 부재는 세지도 초기화하지도 않음. 이전 계약자 이력 제외)
-- 2) get_move_in_absence_candidates: 연속 부재 3회 이상 세대 조회(기존 등급·부재 횟수·최근시도일·최종접촉일·방문대상)
-- 3) D등급 자동 전환·방문대상 자동 등록은 20261017120000(상담 저장 RPC)에서 처리한다(관리자 승인 함수 없음)
-- 4) move_in_visit_target: 방문상담 상태(방문 필요/재방문 필요/방문 완료)를 기본등급과 별도 관리.
--    계약당 진행 중 방문대상 1건(부분 유일 인덱스)으로 중복 생성 방지
-- 5) record_move_in_visit_result: 방문 결과 저장. 상담 저장은 기존 create_move_in_consultation(18인자)을 그대로 호출
--    (기본등급 미변경, 방문 완료 시 의향만 기록, 재방문 필요는 방문 부재로 기록되어 최종 접촉일 미갱신)
-- 6) get_move_in_today_queue: C·D 기준 유지 + 장기 부재 3회 이상 / 방문상담 필요 / 재방문 필요 / 오늘 방문 완료 추가
-- 상담 저장 RPC·기존 권한·RLS·정책값은 변경하지 않음. 기존 세대의 등급은 이 마이그레이션으로 바뀌지 않음.
begin;

do $preflight$
declare
  v_def text;
  v_check_names text[];
  v_check_def text;
  v_check_values text[];
begin
  select pg_get_functiondef(oid) into v_def
  from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'get_move_in_today_queue';
  if v_def is null
     or position('latest_absent_at' in v_def) = 0
     or position('FOLLOW_UP_DUE' in v_def) > 0
     or position('uos.legacy_grade in (''C'', ''D'')' in v_def) = 0 then
    raise exception 'get_move_in_today_queue is not the 20261015 definition; abort';
  end if;
  if to_regprocedure('private.write_rpc_actor(uuid)') is null
     or to_regprocedure('private.require_project_admin(uuid,uuid)') is null
     or to_regprocedure('private.require_field_customer_write_access(uuid,uuid,uuid)') is null then
    raise exception 'required private guard functions missing; abort';
  end if;
  if not exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace and proname = 'create_move_in_consultation'
      and pronargs = 18 and 'p_expected_contract_id' = any(proargnames)
  ) then
    raise exception 'guarded create_move_in_consultation(18) missing; abort';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'unit_occupancy_status' and column_name = 'legacy_grade_as_of'
  ) then
    raise exception 'unit_occupancy_status.legacy_grade_as_of missing; abort';
  end if;
  -- 등급 변경 이력은 field_changed = 'legacy_grade'로 기록한다. 값 제한 CHECK가 운영 기존 4개 값 그대로일 때만
  -- 아래에서 'legacy_grade'만 추가해 다시 만든다(다른 형태·이름이면 중단)
  select array_agg(c.conname::text order by c.conname), max(pg_get_constraintdef(c.oid))
    into v_check_names, v_check_def
  from pg_constraint c
  where c.conrelid = 'public.contract_status_history'::regclass and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%field_changed%';
  select array_agg(m[1] order by m[1]) into v_check_values
  from regexp_matches(coalesce(v_check_def, ''), '''([a-z_]+)''', 'g') as m;
  if v_check_names is distinct from array['contract_status_history_field_changed_check']
     or v_check_values is distinct from array['funding_status', 'move_in_status', 'occupancy_intent', 'operational_intent'] then
    raise exception 'contract_status_history.field_changed check is not the expected 4-value definition; abort';
  end if;
  if to_regclass('public.move_in_visit_target') is not null then
    raise exception 'move_in_visit_target already exists; abort';
  end if;
  -- 처리 기록은 당일 source_fingerprint로만 매칭된다. 사유 목록이 바뀌면 오늘 처리한 세대가 다시 노출되므로
  -- 오늘(KST) 처리 기록이 있으면 적용하지 않는다(다음 날 적용)
  if exists (
    select 1 from public.move_in_tracking_disposition
    where tracking_date = (now() at time zone 'Asia/Seoul')::date
  ) then
    raise exception 'move_in_tracking_disposition has rows for today; apply on a day without dispositions';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

-- 등급 변경 이력(field_changed = 'legacy_grade') 허용. 기존 4개 값은 그대로 두고 'legacy_grade'만 추가한다.
-- 기존 이력 행은 수정하지 않는다(기존 행은 모두 4개 값 안에 있으므로 재검증을 통과한다).
alter table public.contract_status_history
  drop constraint contract_status_history_field_changed_check;
alter table public.contract_status_history
  add constraint contract_status_history_field_changed_check
  check (((field_changed)::text = any (array[('occupancy_intent'::character varying)::text, ('funding_status'::character varying)::text, ('move_in_status'::character varying)::text, ('operational_intent'::character varying)::text, ('legacy_grade'::character varying)::text])));

-- 방문상담 대상. 기본등급(unit_occupancy_status.legacy_grade)과 별도로 방문 진행 상태와 확인한 의향을 보관한다.
create table public.move_in_visit_target (
  visit_target_id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  unit_id uuid not null,
  contract_id uuid not null,
  customer_id uuid not null,
  status text not null default 'VISIT_NEEDED'
    check (status in ('VISIT_NEEDED', 'REVISIT_NEEDED', 'VISITED')),
  source text not null default 'ABSENCE_STREAK' check (source in ('ABSENCE_STREAK')),
  absence_streak_at_open integer not null check (absence_streak_at_open >= 3),
  grade_before text,
  grade_changed boolean not null default false,
  visit_intent public.occupancy_intent,
  visit_count integer not null default 0 check (visit_count >= 0),
  last_visit_consultation_id uuid references public.consultation(id),
  last_visited_at timestamptz,
  created_by uuid not null references public.project_member(id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.project_member(id),
  updated_at timestamptz not null default now(),
  foreign key (contract_id, project_id, unit_id) references public.contract(contract_id, project_id, unit_id),
  check (status <> 'VISITED' or (visit_intent is not null and last_visited_at is not null))
);

-- 계약당 진행 중(방문 필요·재방문 필요) 방문대상은 1건만
create unique index move_in_visit_target_open_uidx
  on public.move_in_visit_target (project_id, contract_id)
  where status in ('VISIT_NEEDED', 'REVISIT_NEEDED');
create index move_in_visit_target_project_unit_idx
  on public.move_in_visit_target (project_id, unit_id);

alter table public.move_in_visit_target enable row level security;
revoke all on public.move_in_visit_target from public, anon, authenticated;
grant select on public.move_in_visit_target to authenticated;
-- 조회 범위는 현재 세대 점유상태(unit_occupancy_status)의 RLS를 그대로 따른다.
-- 현재 계약 행이 보이는 사용자만, 현재 계약의 방문대상만 볼 수 있다(이전 계약 방문대상 비노출).
-- 쓰기는 아래 SECURITY DEFINER RPC로만 한다.
create policy move_in_visit_target_select_current on public.move_in_visit_target
  for select to authenticated
  using (exists (
    select 1 from public.unit_occupancy_status uos
    where uos.project_id = move_in_visit_target.project_id
      and uos.unit_id = move_in_visit_target.unit_id
      and uos.contract_id = move_in_visit_target.contract_id
  ));

-- 연속 부재 3회 이상 세대. 호출자 권한(RLS)으로 실행한다.
CREATE OR REPLACE FUNCTION public.get_move_in_absence_candidates(p_project_id uuid)
 RETURNS TABLE(unit_id uuid, contract_id uuid, customer_id uuid, legacy_grade text, absence_streak integer, latest_attempt_at timestamp with time zone, last_contact_at timestamp with time zone, open_visit_target_id uuid, open_visit_status text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
current_holder as (
  select uos.project_id, uos.unit_id, uos.contract_id, uos.legacy_grade, uos.last_contact_at, c.customer_id
  from public.unit_occupancy_status uos
  join public.contract c
    on c.project_id = uos.project_id
   and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id
   and c.contract_status = 'ACTIVE'::public.contract_status
  where uos.project_id = p_project_id
    and not exists (
      select 1
      from public.move_in_tracking_exclusion exclusion
      where exclusion.project_id = uos.project_id
        and exclusion.unit_id = uos.unit_id
        and exclusion.contract_id = uos.contract_id
        and exclusion.active
    )
),
-- 현재 ACTIVE 계약자 본인 상담만(이전 계약자 이력 혼입 차단)
holder_consultation as (
  select k.unit_id, k.consulted_at, k.contact_type, k.structured_tags->>'legacy_grade' as grade_tag
  from public.consultation k
  join current_holder h
    on h.unit_id = k.unit_id
   and h.customer_id = k.customer_id
  where k.project_id = p_project_id
),
contact_aggregate as (
  select
    unit_id,
    max(consulted_at) filter (where grade_tag is distinct from '부재') as latest_real_contact_at,
    max(consulted_at) filter (where grade_tag = '부재') as latest_absent_at,
    max(consulted_at) as latest_attempt_at
  from holder_consultation
  group by unit_id
),
-- 마지막 실제 접촉 이후의 전화 부재만 센다(실제 접촉 = 초기화). 같은 시각이면 실제 접촉 우선
streak as (
  select hc.unit_id, count(*)::integer as absence_streak
  from holder_consultation hc
  join contact_aggregate ca on ca.unit_id = hc.unit_id
  where hc.grade_tag = '부재'
    and hc.contact_type = 'CALL'
    and (ca.latest_real_contact_at is null or hc.consulted_at > ca.latest_real_contact_at)
  group by hc.unit_id
),
open_visit as (
  select vt.unit_id, vt.contract_id, vt.visit_target_id, vt.status
  from public.move_in_visit_target vt
  where vt.project_id = p_project_id
    and vt.status in ('VISIT_NEEDED', 'REVISIT_NEEDED')
)
select
  h.unit_id,
  h.contract_id,
  h.customer_id,
  h.legacy_grade,
  s.absence_streak,
  ca.latest_attempt_at,
  -- 기존 last_contact_at이 부재 시도 시각과 같으면(구 RPC 오염값) 실제 접촉으로 보지 않음
  greatest(
    ca.latest_real_contact_at,
    case when h.last_contact_at is not distinct from ca.latest_absent_at then null else h.last_contact_at end
  ) as last_contact_at,
  ov.visit_target_id as open_visit_target_id,
  ov.status as open_visit_status
from current_holder h
join streak s on s.unit_id = h.unit_id
join contact_aggregate ca on ca.unit_id = h.unit_id
left join open_visit ov on ov.unit_id = h.unit_id and ov.contract_id = h.contract_id
where s.absence_streak >= 3
order by s.absence_streak desc, h.unit_id;
$function$;

-- 방문 결과 저장. 기본등급은 바꾸지 않는다.
CREATE OR REPLACE FUNCTION public.record_move_in_visit_result(p_project_id uuid, p_visit_target_id uuid, p_expected_contract_id uuid, p_result text, p_content text, p_occupancy_intent occupancy_intent DEFAULT NULL::occupancy_intent)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_member_id uuid;
  v_target public.move_in_visit_target%rowtype;
  v_consultation_id uuid;
begin
  v_member_id := private.write_rpc_actor(p_project_id);

  if p_result not in ('VISITED', 'REVISIT_NEEDED') then
    raise exception 'invalid visit result' using errcode = '23514';
  end if;
  if p_result = 'VISITED' and p_occupancy_intent is null then
    raise exception 'visit intent is required' using errcode = '23514';
  end if;
  if p_result = 'REVISIT_NEEDED' and p_occupancy_intent is not null then
    raise exception 'intent cannot be recorded without a completed visit' using errcode = '23514';
  end if;

  select * into v_target
  from public.move_in_visit_target vt
  where vt.visit_target_id = p_visit_target_id
    and vt.project_id = p_project_id
  for update;
  if not found then
    raise exception 'visit target not found' using errcode = '23514';
  end if;
  if v_target.contract_id is distinct from p_expected_contract_id then
    raise exception 'visit target contract mismatch' using errcode = '23514';
  end if;
  if v_target.status not in ('VISIT_NEEDED', 'REVISIT_NEEDED') then
    raise exception 'visit target is closed' using errcode = '23514';
  end if;
  perform private.require_field_customer_write_access(p_project_id, v_target.customer_id, v_member_id);

  -- 기존 상담 저장 RPC(현재 ACTIVE 계약 재검증 포함)로 방문 상담을 남긴다.
  -- 재방문 필요 = 방문 부재: 부재로 저장되어 최종 접촉일·기본등급을 갱신하지 않는다.
  v_consultation_id := public.create_move_in_consultation(
    p_project_id := p_project_id,
    p_unit_id := v_target.unit_id,
    p_customer_id := v_target.customer_id,
    p_consultation_type := 'VISIT',
    p_content := p_content,
    p_expected_contract_id := v_target.contract_id,
    p_legacy_grade := case when p_result = 'REVISIT_NEEDED' then '부재' else null end,
    p_next_contact_at := null::timestamptz,
    p_occupancy_intent := p_occupancy_intent,
    p_funding_status := null::public.funding_status,
    p_move_in_status := null::public.move_in_status,
    p_planned_move_in_date := null::date,
    p_balance_paid_at := null::timestamptz,
    p_actual_move_in_date := null::timestamptz,
    p_reason := null::text,
    p_business_purpose := null::text,
    p_clear_next_contact_at := false,
    p_operational_intent := null::public.operational_intent
  );

  update public.move_in_visit_target
  set status = p_result,
      visit_intent = case when p_result = 'VISITED' then p_occupancy_intent else visit_intent end,
      visit_count = visit_count + 1,
      last_visit_consultation_id = v_consultation_id,
      last_visited_at = now(),
      updated_by = v_member_id,
      updated_at = now()
  where visit_target_id = v_target.visit_target_id;

  return v_consultation_id;
end;
$function$;

revoke all on function public.get_move_in_absence_candidates(uuid) from public, anon;
revoke all on function public.record_move_in_visit_result(uuid, uuid, uuid, text, text, public.occupancy_intent) from public, anon;
grant execute on function public.get_move_in_absence_candidates(uuid) to authenticated;
grant execute on function public.record_move_in_visit_result(uuid, uuid, uuid, text, text, public.occupancy_intent) to authenticated;

CREATE OR REPLACE FUNCTION public.get_move_in_today_queue(p_project_id uuid, p_now timestamp with time zone)
 RETURNS TABLE(unit_id uuid, contract_id uuid, legacy_grade text, occupancy_intent occupancy_intent, funding_status funding_status, move_in_status move_in_status, last_contact_at timestamp with time zone, next_contact_at timestamp with time zone, reason_codes text[], problem_categories text[], priority text, source_fingerprint text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with
clock as (
  select p_now as now_at,
         (p_now at time zone 'Asia/Seoul')::date as tracking_date,
         date_trunc('day', p_now at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' as day_start,
         (date_trunc('day', p_now at time zone 'Asia/Seoul') + interval '1 day') at time zone 'Asia/Seoul' as next_day_start
),
-- 연속 전화 부재 3회 이상(현재 계약자 기준)
absence as (
  select cand.unit_id, cand.contract_id, cand.absence_streak
  from public.get_move_in_absence_candidates(p_project_id) cand
),
-- 진행 중 방문대상 + 오늘 방문 완료
visit_target as (
  select vt.unit_id, vt.contract_id, vt.status
  from public.move_in_visit_target vt
  cross join clock
  where vt.project_id = p_project_id
    and (vt.status in ('VISIT_NEEDED', 'REVISIT_NEEDED')
         or (vt.status = 'VISITED' and vt.last_visited_at >= clock.day_start and vt.last_visited_at < clock.next_day_start))
),
-- 집중관리 대상: 현재 ACTIVE 계약자의 기본등급 C·D + 장기 부재·방문상담 세대
active_units as (
  select
    uos.project_id,
    uos.unit_id,
    uos.contract_id,
    uos.legacy_grade,
    uos.occupancy_intent,
    uos.funding_status,
    uos.move_in_status,
    uos.last_contact_at,
    uos.next_contact_at,
    c.customer_id
  from public.unit_occupancy_status uos
  join public.project_unit pu
    on pu.project_id = uos.project_id
   and pu.unit_id = uos.unit_id
  join public.contract c
    on c.project_id = uos.project_id
   and c.unit_id = uos.unit_id
   and c.contract_id = uos.contract_id
   and c.contract_status = 'ACTIVE'::public.contract_status
  where uos.project_id = p_project_id
    and (uos.legacy_grade in ('C', 'D')
         or exists (select 1 from absence a where a.unit_id = uos.unit_id and a.contract_id = uos.contract_id)
         or exists (select 1 from visit_target v where v.unit_id = uos.unit_id and v.contract_id = uos.contract_id))
    and not exists (
      select 1
      from public.move_in_tracking_exclusion exclusion
      where exclusion.project_id = uos.project_id
        and exclusion.unit_id = uos.unit_id
        and exclusion.contract_id = uos.contract_id
        and exclusion.active
    )
),
-- 현재 ACTIVE 계약자 본인 상담만 집계(이전 계약자 이력 혼입 차단).
-- 부재 기록은 시도로만 보고 실제 접촉일에서 제외한다.
contact_aggregate as (
  select
    k.unit_id,
    max(k.consulted_at) filter (where (k.structured_tags->>'legacy_grade') is distinct from '부재') as latest_real_contact_at,
    max(k.consulted_at) as latest_attempt_at,
    max(k.consulted_at) filter (where (k.structured_tags->>'legacy_grade') = '부재') as latest_absent_at
  from public.consultation k
  join active_units au
    on au.unit_id = k.unit_id
   and au.customer_id = k.customer_id
  where k.project_id = p_project_id
  group by k.unit_id
),
-- 방문 일정도 현재 계약 기준만 사용
visit_schedule as (
  select cs.unit_id, min(cs.planned_at) as visit_planned_at
  from public.contact_schedule cs
  join active_units au
    on au.unit_id = cs.unit_id
   and au.contract_id = cs.contract_id
  cross join clock
  where cs.project_id = p_project_id
    and cs.status = 'PENDING'::public.contact_schedule_status
    and cs.contact_type = 'VISIT'
    and cs.planned_at >= clock.day_start
    and cs.planned_at < clock.next_day_start
  group by cs.unit_id
),
active_policy as (
  select project_id, reason_code, stale_after
  from public.move_in_tracking_policy
  where project_id = p_project_id
    and active
),
base as (
  select
    active_units.*,
    -- 기존 last_contact_at이 부재 시도 시각과 같으면(구 RPC 오염값) 실제 접촉으로 보지 않음
    greatest(
      contact_aggregate.latest_real_contact_at,
      case when active_units.last_contact_at is not distinct from contact_aggregate.latest_absent_at then null
           else active_units.last_contact_at end
    ) as effective_last_contact_at,
    contact_aggregate.latest_attempt_at,
    (contact_aggregate.latest_absent_at is not null
      and contact_aggregate.latest_absent_at = contact_aggregate.latest_attempt_at) as latest_is_absent,
    visit_schedule.visit_planned_at,
    absence.absence_streak,
    visit_target.status as visit_status
  from active_units
  left join contact_aggregate on contact_aggregate.unit_id = active_units.unit_id
  left join visit_schedule on visit_schedule.unit_id = active_units.unit_id
  left join absence on absence.unit_id = active_units.unit_id and absence.contract_id = active_units.contract_id
  left join visit_target on visit_target.unit_id = active_units.unit_id and visit_target.contract_id = active_units.contract_id
),
reason_rows as (
  -- 장기 부재·방문상담 세대를 C·D 재접촉보다 우선 표시
  select b.*, 'ABSENCE_STREAK'::text as reason_code, 'REPEATED_NO_CONTACT'::text as problem_category, 12 as priority_rank
  from base b
  where b.absence_streak >= 3

  union all
  select b.*, 'REVISIT_NEEDED', 'REPEATED_NO_CONTACT', 13
  from base b
  where b.visit_status = 'REVISIT_NEEDED'

  union all
  select b.*, 'VISIT_NEEDED', 'REPEATED_NO_CONTACT', 14
  from base b
  where b.visit_status = 'VISIT_NEEDED'

  union all
  select b.*, 'D_GRADE_STALE', 'REPEATED_NO_CONTACT', 20
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'D_GRADE_STALE'
  cross join clock
  where b.legacy_grade = 'D'
    and (b.effective_last_contact_at is null or b.effective_last_contact_at <= clock.now_at - policy.stale_after)

  union all
  select b.*, 'C_GRADE_STALE', 'REPEATED_NO_CONTACT', 30
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'C_GRADE_STALE'
  cross join clock
  where b.legacy_grade = 'C'
    and (b.effective_last_contact_at is null or b.effective_last_contact_at <= clock.now_at - policy.stale_after)

  union all
  select b.*, 'C_GRADE_FUNDING', 'CREDIT', 40
  from base b
  where b.legacy_grade = 'C'
    and b.funding_status in ('LOAN_NEEDED'::public.funding_status, 'FUNDING_SHORTAGE'::public.funding_status, 'EXISTING_HOME_UNSOLD'::public.funding_status)

  union all
  select b.*, 'ABSENCE_RETRY', 'REPEATED_NO_CONTACT', 50
  from base b
  join active_policy policy on policy.project_id = b.project_id and policy.reason_code = 'ABSENCE_RETRY'
  cross join clock
  -- C·D 세대 중 최신 기록이 부재인 세대. 경과는 마지막 시도 기준
  where b.legacy_grade in ('C', 'D')
    and b.latest_is_absent
    and b.latest_attempt_at <= clock.now_at - policy.stale_after

  union all
  select b.*, 'SALE_TRACKING', 'SALE', 60
  from base b
  where b.legacy_grade in ('C', 'D')
    and b.occupancy_intent in ('SALE'::public.occupancy_intent, 'JEONSE'::public.occupancy_intent, 'MONTHLY_RENT'::public.occupancy_intent)

  union all
  select b.*, 'VISIT_SCHEDULED', 'MOVE_IN_CONFIRMED', 70
  from base b
  where b.legacy_grade in ('C', 'D')
    and b.visit_planned_at is not null

  union all
  select b.*, 'VISIT_DONE', 'REPEATED_NO_CONTACT', 80
  from base b
  where b.visit_status = 'VISITED'
),
reason_aggregate as (
  select
    project_id,
    unit_id,
    contract_id,
    legacy_grade,
    occupancy_intent,
    funding_status,
    move_in_status,
    effective_last_contact_at as last_contact_at,
    next_contact_at,
    array_agg(distinct reason_code order by reason_code) as reason_codes,
    array_agg(distinct problem_category order by problem_category) as problem_categories,
    min(priority_rank) as priority_rank
  from reason_rows
  group by project_id, unit_id, contract_id, legacy_grade, occupancy_intent, funding_status,
           move_in_status, effective_last_contact_at, next_contact_at
),
queue_rows as (
  select
    reason_aggregate.*,
    case
      when priority_rank <= 20 then 'HIGH'
      when priority_rank <= 50 then 'MEDIUM'
      else 'LOW'
    end as priority,
    md5(concat_ws('|',
      unit_id::text,
      contract_id::text,
      array_to_string(reason_codes, ','),
      coalesce(legacy_grade, ''),
      occupancy_intent::text,
      funding_status::text,
      move_in_status::text,
      coalesce(next_contact_at::text, ''),
      coalesce(last_contact_at::text, '')
    )) as source_fingerprint
  from reason_aggregate
)
select
  q.unit_id,
  q.contract_id,
  q.legacy_grade,
  q.occupancy_intent,
  q.funding_status,
  q.move_in_status,
  q.last_contact_at,
  q.next_contact_at,
  q.reason_codes,
  q.problem_categories,
  q.priority,
  q.source_fingerprint
from queue_rows q
cross join clock
left join public.move_in_tracking_disposition d
  on d.project_id = q.project_id
 and d.unit_id = q.unit_id
 and d.contract_id = q.contract_id
 and d.tracking_date = clock.tracking_date
 and d.source_fingerprint = q.source_fingerprint
where d.disposition_id is null
   or (d.action = 'SNOOZE' and d.snoozed_until <= clock.now_at)
order by q.priority_rank, q.unit_id;
$function$;

commit;
