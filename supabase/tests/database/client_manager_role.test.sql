-- CLIENT_MANAGER(시행사 관리자): 화양 현장운영 SELECT/RPC는 PROJECT_ADMIN에 준하지만,
-- 계약 생성/해지/명의변경/고객 마스터 수정은 여전히 admin 전용으로 막혀야 한다.
-- hwayang_shared_field.test.sql과 같은 합성 데이터 패턴을 재사용하되, 별도 트랜잭션(begin/rollback)이므로
-- 동일한 project id/시드 auth 사용자를 다시 써도 서로 간섭하지 않는다.
begin;
select no_plan();
create function pg_temp.hid(prefix text, n integer) returns uuid language sql immutable as $$ select md5('client-manager-test-' || prefix || n::text)::uuid $$;
create function pg_temp.login(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,true)::void $$;

insert into public.project(id,organization_id,name) values ('1283e198-5043-4027-96d6-edcc7a6686c6','10000000-0000-4000-8000-000000000001','Synthetic Hwayang (client-manager)');
insert into public.project_member(id,project_id,user_id,role) values
(pg_temp.hid('member',1),'1283e198-5043-4027-96d6-edcc7a6686c6','30000000-0000-4000-8000-0000000000c1','PROJECT_ADMIN'),
(pg_temp.hid('member',2),'1283e198-5043-4027-96d6-edcc7a6686c6','30000000-0000-4000-8000-00000000000a','COUNSELOR'),
(pg_temp.hid('member',3),'1283e198-5043-4027-96d6-edcc7a6686c6','30000000-0000-4000-8000-00000000000e','CLIENT_MANAGER');

insert into public.project_unit(unit_id,project_id,building_no,unit_no) select pg_temp.hid('unit',n),'1283e198-5043-4027-96d6-edcc7a6686c6','101',n::text from generate_series(1,5) n;
insert into public.customer(id,project_id,name,phone,phone_normalized,assigned_counselor_id)
select pg_temp.hid('customer',n),'1283e198-5043-4027-96d6-edcc7a6686c6','Synthetic '||n,'010'||lpad(n::text,8,'0'),'010'||lpad(n::text,8,'0'),case when n=1 then pg_temp.hid('member',2) else null end from generate_series(1,5) n;
insert into public.contract(contract_id,project_id,unit_id,customer_id,contract_status) select pg_temp.hid('contract',n),'1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('unit',n),pg_temp.hid('customer',n),'ACTIVE' from generate_series(1,5) n;
insert into public.unit_occupancy_status(project_id,unit_id,contract_id) select '1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('unit',n),pg_temp.hid('contract',n) from generate_series(1,5) n;
insert into public.consultation(project_id,customer_id,unit_id,counselor_id,created_by,content,consulted_at) values('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('customer',1),pg_temp.hid('unit',1),pg_temp.hid('member',2),pg_temp.hid('member',2),'Synthetic history',now());

-- 화양 밖 프로젝트(IDOR/경계 확인용)
insert into public.project_unit(unit_id,project_id,building_no,unit_no) values(pg_temp.hid('otherunit',1),'20000000-0000-4000-8000-000000000001','999','1');
insert into public.contract(contract_id,project_id,customer_id,unit_id,contract_status) values(pg_temp.hid('othercontract',1),'20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-0000000000a1',pg_temp.hid('otherunit',1),'ACTIVE');

-- =========================================================================
-- CLIENT_MANAGER 본인 검증: PROJECT_ADMIN과 동일한 화양 현장 SELECT/RPC 범위를 가져야 한다.
-- =========================================================================
select pg_temp.login('30000000-0000-4000-8000-00000000000e');
set local role authenticated;
select is((select count(*) from public.project_unit where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),5::bigint,'client manager: all project_unit visible');
select is((select count(*) from public.contract where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),5::bigint,'client manager: all contract visible');
select is((select count(*) from public.unit_occupancy_status where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),5::bigint,'client manager: all unit_occupancy_status visible');
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),5::bigint,'client manager: all customer visible (field member)');
select is((select count(*) from public.consultation where project_id='1283e198-5043-4027-96d6-edcc7a6686c6' and content='Synthetic history'),1::bigint,'client manager: consultation visible (field member)');

-- 현장 운영 RPC: PROJECT_ADMIN과 동일하게 전부 성공해야 한다.
select lives_ok($$select public.create_move_in_consultation('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('unit',2),pg_temp.hid('customer',2),'OUTBOUND','cm-consult',p_legacy_grade:='A',p_next_contact_at:=now()+interval '1 day',p_move_in_status:='CONTACTED')$$,'client manager: consultation + occupancy write');
select is((select created_by from public.consultation where project_id='1283e198-5043-4027-96d6-edcc7a6686c6' and content='cm-consult'),pg_temp.hid('member',3),'client manager: actual logged-in author');
select lives_ok($$select public.generate_report('1283e198-5043-4027-96d6-edcc7a6686c6',current_date,'MOVE_IN','DAILY','{}')$$,'client manager: worklog report generation');
select lives_ok($$select public.save_brokerage_office('1283e198-5043-4027-96d6-edcc7a6686c6','Synthetic office (client manager)')$$,'client manager: brokerage write');
select lives_ok($$select public.save_move_in_unit_deal('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('unit',2),pg_temp.hid('contract',2),pg_temp.hid('customer',2),'CONSENTED','IN_PROGRESS',true,false,false)$$,'client manager: deal write');

-- 상담사 배정/현장 인력 표시이름: 이번 기능에서 새로 열린 RPC (require_field_manage_access).
select lives_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',3)],pg_temp.hid('member',2))$$,'client manager: can assign customers to counselor');
select is((select assigned_counselor_id from public.customer where id=pg_temp.hid('customer',3)),pg_temp.hid('member',2),'client manager: assignment actually applied');
select lives_ok($$select public.update_move_in_field_member_display_name('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('member',2),'상담사 이름')$$,'client manager: can rename field member display name');

-- 계약/명의변경/고객 마스터: PROJECT_ADMIN 전용 게이트(require_project_admin)는 그대로 막혀 있어야 한다.
select throws_ok($$select public.create_contract('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('customer',4),pg_temp.hid('unit',4))$$,'42501',null,'client manager: contract create denied');
select throws_ok($$select public.cancel_contract('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('contract',4),'test')$$,'42501',null,'client manager: contract cancel denied');
select throws_ok($$select public.transfer_contract_holder('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('contract',4),pg_temp.hid('customer',5))$$,'42501',null,'client manager: holder transfer denied');
-- update_customer_phone은 존재한 적 없는 RPC(stale 참조)였다. 고객 전화번호/원장에 실제 쓰기 권한을 갖는
-- 유일한 경로는 apply_move_in_import_row이며, 이미 require_project_admin으로 막혀 있다(P0 확인 완료).
select throws_ok($$select public.apply_move_in_import_row('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('unit',4),'NO_OP')$$,'42501',null,'client manager: customer/contract master write (import) denied');
select throws_ok($$select public.generate_report('1283e198-5043-4027-96d6-edcc7a6686c6',current_date,'SALES','DAILY','{}')$$,'42501',null,'client manager: non-field report phase stays admin-only');

-- 화양 밖 프로젝트: 프로젝트 경계 밖에서는 어떤 것도 보이거나 열리지 않아야 한다.
select is((select count(*) from public.customer where project_id='20000000-0000-4000-8000-000000000002'),0::bigint,'client manager: other project read denied');
select throws_ok($$select public.generate_report('20000000-0000-4000-8000-000000000001',current_date,'MOVE_IN','DAILY','{}')$$,'42501',null,'client manager: non-Hwayang project stays denied');
select throws_ok($$select public.assign_move_in_customers('20000000-0000-4000-8000-000000000001',array[pg_temp.hid('customer',2)],pg_temp.hid('member',2))$$,'42501',null,'client manager: assignment outside own project denied');
select throws_ok($$select public.create_move_in_consultation('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('otherunit',1),pg_temp.hid('customer',2),'OUTBOUND','bad')$$,'23514',null,'client manager: cross-project unit IDOR denied');
reset role;

-- =========================================================================
-- PROJECT_ADMIN 대조군: CLIENT_MANAGER가 새로 얻은 배정 RPC도 admin은 계속 쓸 수 있어야 한다.
-- =========================================================================
select pg_temp.login('30000000-0000-4000-8000-0000000000c1');
set local role authenticated;
select lives_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',4)],pg_temp.hid('member',2))$$,'project admin: assignment RPC unaffected by client manager change');
reset role;

-- =========================================================================
-- COUNSELOR 대조군: 배정/현장 관리 RPC는 여전히 막혀 있어야 한다(회귀 확인).
-- =========================================================================
select pg_temp.login('30000000-0000-4000-8000-00000000000a');
set local role authenticated;
select throws_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',4)],pg_temp.hid('member',2))$$,'42501',null,'counselor: assignment RPC still admin/client-manager only');
select throws_ok($$select public.update_move_in_field_member_display_name('1283e198-5043-4027-96d6-edcc7a6686c6',pg_temp.hid('member',2),'이름 변경 시도')$$,'42501',null,'counselor: display name RPC still admin/client-manager only');
reset role;

-- 함수 권한 표면: require_field_manage_access는 SECURITY DEFINER RPC 내부에서만 쓰이고
-- authenticated/anon이 직접 호출할 수 없어야 한다.
select ok(not has_function_privilege('authenticated','private.require_field_manage_access(uuid,uuid)','EXECUTE'),'authenticated cannot call require_field_manage_access directly');
select ok(not has_function_privilege('anon','private.require_field_manage_access(uuid,uuid)','EXECUTE'),'anon cannot call require_field_manage_access directly');

-- =========================================================================
-- 비활성/비회원/미인증 CLIENT_MANAGER: 기존 화양 공동관리 경계 패턴과 동일하게 막혀야 한다.
-- =========================================================================
select pg_temp.login('30000000-0000-4000-8000-00000000000e');
update public.project_member set active=false where id=pg_temp.hid('member',3);
set local role authenticated;
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),0::bigint,'inactive client manager: read denied');
select throws_ok($$select public.save_brokerage_office('1283e198-5043-4027-96d6-edcc7a6686c6','denied')$$,'42501',null,'inactive client manager: write denied');
select throws_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',4)],pg_temp.hid('member',2))$$,'42501',null,'inactive client manager: assignment denied');
reset role;
update public.project_member set active=true where id=pg_temp.hid('member',3);

select pg_temp.login('30000000-0000-4000-8000-0000000000c2');
set local role authenticated;
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),0::bigint,'nonmember: read denied');
select throws_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',4)],pg_temp.hid('member',2))$$,'42501',null,'nonmember: assignment denied');
reset role;

select pg_temp.login('');
set local role authenticated;
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),0::bigint,'missing auth: read denied');
select throws_ok($$select public.save_brokerage_office('1283e198-5043-4027-96d6-edcc7a6686c6','denied')$$,'42501',null,'missing auth: write denied');
reset role;

set local role anon;
select throws_ok($$select public.assign_move_in_customers('1283e198-5043-4027-96d6-edcc7a6686c6',array[pg_temp.hid('customer',4)],pg_temp.hid('member',2))$$,'42501',null,'anon: assignment RPC denied');
reset role;

-- 닫힌 프로젝트/비활성 조직: 활성 CLIENT_MANAGER라도 기존 경계대로 거절해야 한다.
select pg_temp.login('30000000-0000-4000-8000-00000000000e');
update public.project set status='CLOSED' where id='1283e198-5043-4027-96d6-edcc7a6686c6';
set local role authenticated;
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),0::bigint,'closed project: client manager read denied');
select throws_ok($$select public.save_brokerage_office('1283e198-5043-4027-96d6-edcc7a6686c6','denied')$$,'42501',null,'closed project: client manager write denied');
reset role;
update public.project set status='ACTIVE' where id='1283e198-5043-4027-96d6-edcc7a6686c6';
update public.organization set status='INACTIVE' where id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from public.customer where project_id='1283e198-5043-4027-96d6-edcc7a6686c6'),0::bigint,'inactive organization: client manager read denied');
select throws_ok($$select public.save_brokerage_office('1283e198-5043-4027-96d6-edcc7a6686c6','denied')$$,'42501',null,'inactive organization: client manager write denied');
reset role;

select * from finish();
rollback;
