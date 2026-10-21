-- 20261019120000_rls_membership_set 롤백: 대상 SELECT 정책 7개를 원문 조건으로 되돌리고 보조 함수를 삭제한다. 데이터 변경 없음.
begin;

do $preflight$
declare
  v_bad text;
begin
  -- 대상 정책 7개의 현재 조건이 A8 적용 상태와 같아야 한다(다르면 아무것도 바꾸지 않고 중단)
  select string_agg(e.p, ', ') into v_bad
  from (values
    ('consultation','consultation_select'),
    ('consultation','consultation_hwayang_field_select'),
    ('customer','customer_select'),
    ('customer','customer_hwayang_field_select'),
    ('project_unit','project_unit_select'),
    ('contract','contract_select'),
    ('unit_occupancy_status','unit_occupancy_status_select')
  ) as e(t, p)
  left join pg_policies pp on pp.schemaname = 'public' and pp.tablename = e.t and pp.policyname = e.p
  where pp.policyname is null
     or pp.cmd <> 'SELECT' or pp.permissive <> 'PERMISSIVE' or pp.roles::text <> '{authenticated}' or pp.with_check is not null
     or position('private.current_project_memberships()' in pp.qual) = 0;
  if v_bad is not null then
    raise exception 'policy definition is not the expected A8 state: %; abort', v_bad;
  end if;
  
  perform set_config('lock_timeout', '5s', true);
end
$preflight$;

alter policy consultation_select on public.consultation using ((private.has_project_role(project_id, ARRAY['PROJECT_ADMIN'::project_member_role]) OR (EXISTS ( SELECT 1
   FROM customer c
  WHERE ((c.id = consultation.customer_id) AND (c.project_id = consultation.project_id) AND (c.assigned_counselor_id = private.current_project_member_id(consultation.project_id, ARRAY['COUNSELOR'::project_member_role])))))));
alter policy consultation_hwayang_field_select on public.consultation using (private.is_hwayang_field_member(project_id));
alter policy customer_select on public.customer using (((assigned_counselor_id = private.current_project_member_id(project_id, ARRAY['COUNSELOR'::project_member_role])) OR private.has_project_role(project_id, ARRAY['PROJECT_ADMIN'::project_member_role])));
alter policy customer_hwayang_field_select on public.customer using (private.is_hwayang_field_member(project_id));
alter policy project_unit_select on public.project_unit using (private.has_project_role(project_id, ARRAY['COUNSELOR'::project_member_role, 'PROJECT_ADMIN'::project_member_role, 'CLIENT_MANAGER'::project_member_role]));
alter policy contract_select on public.contract using (private.has_project_role(project_id, ARRAY['COUNSELOR'::project_member_role, 'PROJECT_ADMIN'::project_member_role, 'CLIENT_MANAGER'::project_member_role]));
alter policy unit_occupancy_status_select on public.unit_occupancy_status using (private.has_project_role(project_id, ARRAY['COUNSELOR'::project_member_role, 'PROJECT_ADMIN'::project_member_role, 'CLIENT_MANAGER'::project_member_role]));

drop function private.current_project_memberships();

commit;
