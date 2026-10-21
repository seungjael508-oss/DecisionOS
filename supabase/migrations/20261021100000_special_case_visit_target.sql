-- 특별관리 '방문 필요'를 오늘 관리 방문상담 업무에 연결 (Production 미적용, 별도 승인 필요)
-- 선행: 20261017100000(방문대상 테이블)·20261019110000(방문 결과 다음 방문일) 적용 후. A10·A11과 순서 무관(같은 객체를 바꾸지 않음).
-- 1) move_in_visit_target.source에 'SPECIAL_CASE' 허용. 연속 부재 3회 이상 조건은 'ABSENCE_STREAK' 출처에만 적용
--    (특별관리 출처는 등록 시점 부재 횟수 0 이상). 기존 행·기존 출처 규칙은 그대로다.
-- 2) move_in_special_case.visit_required가 false→true(또는 true로 신규 저장)일 때만 현재 ACTIVE 계약의 방문대상(VISIT_NEEDED) 1건 등록.
--    계약당 진행 중 방문대상 1건(부분 유일 인덱스) → 이미 진행 중이면(연속 부재 등) 새로 만들지 않는다.
--    visit_required 유지·재저장·해제·특별관리 삭제는 방문대상을 바꾸거나 지우지 않는다(방문 이력 보존).
-- 3) 적용 시점에 이미 visit_required = true인 현재 ACTIVE 계약 특별관리를 같은 규칙으로 1회 등록(진행 중 대상이 없을 때만).
-- 완료·재방문·다음 방문일은 기존 record_move_in_visit_result가 처리하고, 오늘 관리대상 함수는 진행 중 방문대상을 그대로 읽는다.
-- 특별관리 저장 권한(PROJECT_ADMIN·CLIENT_MANAGER)·상담 저장 RPC·오늘 관리대상 함수·RLS·ACL은 변경하지 않는다.
begin;

do $preflight$
begin
  if to_regclass('public.move_in_visit_target') is null
     or to_regclass('public.move_in_special_case') is null
     or to_regprocedure('public.record_move_in_visit_result(uuid,uuid,uuid,text,text,public.occupancy_intent,timestamp with time zone)') is null then
    raise exception 'required objects missing (20261017100000·20261019110000 first); abort';
  end if;
  if to_regprocedure('private.open_visit_target_from_special_case()') is not null
     or exists (select 1 from pg_trigger where tgrelid = 'public.move_in_special_case'::regclass
                and tgname = 'open_visit_target_from_special_case' and not tgisinternal) then
    raise exception 'special case visit target link already exists; abort';
  end if;
  -- 20261017100000 원래 정의(출처 ABSENCE_STREAK 1개, 부재 3회 이상)일 때만 적용
  if (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.move_in_visit_target'::regclass and conname = 'move_in_visit_target_source_check')
       is distinct from 'CHECK ((source = ''ABSENCE_STREAK''::text))'
     or (select pg_get_constraintdef(oid) from pg_constraint
         where conrelid = 'public.move_in_visit_target'::regclass and conname = 'move_in_visit_target_absence_streak_at_open_check')
       is distinct from 'CHECK ((absence_streak_at_open >= 3))' then
    raise exception 'move_in_visit_target checks are not the 20261017100000 definition; abort';
  end if;
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

alter table public.move_in_visit_target
  drop constraint move_in_visit_target_source_check,
  drop constraint move_in_visit_target_absence_streak_at_open_check;
alter table public.move_in_visit_target
  add constraint move_in_visit_target_source_check
    check (source in ('ABSENCE_STREAK', 'SPECIAL_CASE')),
  add constraint move_in_visit_target_absence_streak_at_open_check
    check ((source = 'ABSENCE_STREAK' and absence_streak_at_open >= 3)
        or (source = 'SPECIAL_CASE' and absence_streak_at_open >= 0));

-- 특별관리 저장 RPC(SECURITY DEFINER)가 쓴 행에서만 실행된다. 저장자 = updated_by(본인 활성 멤버, RPC가 확인).
-- 오류 시 특별관리 저장 전체가 함께 롤백된다(같은 트랜잭션).
CREATE FUNCTION private.open_visit_target_from_special_case()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid;
  v_grade text;
begin
  if not new.visit_required or (tg_op = 'UPDATE' and old.visit_required) then
    return null;
  end if;

  select ct.customer_id into v_customer_id
  from public.contract ct
  where ct.project_id = new.project_id
    and ct.unit_id = new.unit_id
    and ct.contract_id = new.contract_id
    and ct.contract_status = 'ACTIVE'::public.contract_status;
  if not found then
    return null;
  end if;

  select uos.legacy_grade into v_grade
  from public.unit_occupancy_status uos
  where uos.project_id = new.project_id
    and uos.unit_id = new.unit_id
    and uos.contract_id = new.contract_id;

  insert into public.move_in_visit_target (
    project_id, unit_id, contract_id, customer_id, status, source,
    absence_streak_at_open, grade_before, grade_changed, created_by, updated_by
  ) values (
    new.project_id, new.unit_id, new.contract_id, v_customer_id, 'VISIT_NEEDED', 'SPECIAL_CASE',
    0, v_grade, false, new.updated_by, new.updated_by
  )
  on conflict (project_id, contract_id) where status in ('VISIT_NEEDED', 'REVISIT_NEEDED') do nothing;

  return null;
end;
$function$;

revoke all on function private.open_visit_target_from_special_case() from public, anon, authenticated;

create trigger open_visit_target_from_special_case
  after insert or update of visit_required on public.move_in_special_case
  for each row execute function private.open_visit_target_from_special_case();

-- 3) 기존 '방문 필요' 특별관리 1회 등록(현재 ACTIVE 계약, 진행 중 방문대상 없을 때만)
insert into public.move_in_visit_target (
  project_id, unit_id, contract_id, customer_id, status, source,
  absence_streak_at_open, grade_before, grade_changed, created_by, updated_by
)
select sc.project_id, sc.unit_id, sc.contract_id, ct.customer_id, 'VISIT_NEEDED', 'SPECIAL_CASE',
       0, uos.legacy_grade, false, sc.updated_by, sc.updated_by
from public.move_in_special_case sc
join public.contract ct
  on ct.project_id = sc.project_id and ct.unit_id = sc.unit_id and ct.contract_id = sc.contract_id
 and ct.contract_status = 'ACTIVE'::public.contract_status
left join public.unit_occupancy_status uos
  on uos.project_id = sc.project_id and uos.unit_id = sc.unit_id and uos.contract_id = sc.contract_id
where sc.visit_required
on conflict (project_id, contract_id) where status in ('VISIT_NEEDED', 'REVISIT_NEEDED') do nothing;

commit;
