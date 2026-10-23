-- [TAS-20261023-01] 잔금완납 5세대 반영 — 쓰기. 14-precheck 결과에서 5세대가 APPLY/ALREADY/KEEP_MOVED_IN이고 STOP이 없을 때만 실행한다.
-- 미수금이 남은 4세대(101-1402 22,365,000원 / 101-1702 22,212,900원 / 104-1504 22,782,600원 / 104-2303 42,758,400원)는
-- 보류한다. 현장 확인 후 아래 목록에 추가해 다시 실행한다.
-- 하나의 DO 블록 = 하나의 트랜잭션. 검증이 하나라도 어긋나면 raise로 전체가 취소된다(부분 반영 없음).
-- 반영 내용
--   move_in_status → 'BALANCE_PAID', balance_paid_at → 지시서 완납일(Asia/Seoul 00:00), 이력 contract_status_history('move_in_status').
--   이미 입주완료(MOVED_IN)면 상태를 낮추지 않고 완납일이 비어 있을 때만 채운다. 이미 잔금완납이면 완납일만 비어 있을 때 채운다.
--   등급(legacy_grade)·특별관리(move_in_special_case)는 건드리지 않는다 → D등급·소송 세대 Lock 유지.
-- 기록자(changed_by/updated_by): 실행 계정이 아닌 아래 이메일의 활성 프로젝트 멤버. 정확히 1명이 아니면 취소된다.
do $$
declare
  v_project uuid := '1283e198-5043-4027-96d6-edcc7a6686c6';
  v_member uuid;
  v_reason text := '잔금완납 반영(TAS-20261023-01, 2026-10-21 입주현황 검증)';
  v_row record;
  v_unit uuid;
  v_contract uuid;
  v_holder text;
  v_status text;
  v_paid timestamptz;
  v_at timestamptz;
  v_n int;
  v_applied int := 0;
  v_filled int := 0;
  v_skipped int := 0;
begin
  select count(*), min(pm.id::text)::uuid into v_n, v_member
  from public.project_member pm join auth.users u on u.id = pm.user_id
  where pm.project_id = v_project and pm.active and lower(u.email) = 'seungjael508@gmail.com';
  if v_n <> 1 then raise exception '기록자 멤버가 1명이 아님(%명); 취소', v_n; end if;

  for v_row in
    select * from (values
      ('101', '2401', '목진란', date '2026-07-23'),
      ('103', '0401', '박옥자', date '2026-10-13'),
      ('103', '2903', '신상흠', date '2026-10-21'),
      ('105', '1401', '남기수', date '2026-10-08'),
      ('107', '0604', '박동현', date '2026-02-19')
    ) t(b, u, holder, paid_on)
  loop
    select count(*), min(pu.unit_id::text)::uuid into v_n, v_unit
    from public.project_unit pu
    where pu.project_id = v_project
      and coalesce(nullif(regexp_replace(btrim(pu.building_no), '^0+(?=[0-9])', ''), ''), '0') = ltrim(v_row.b, '0')
      and coalesce(nullif(regexp_replace(btrim(pu.unit_no), '^0+(?=[0-9])', ''), ''), '0') = ltrim(v_row.u, '0');
    if v_n <> 1 then raise exception '%-% 세대가 1개가 아님(%개); 취소', v_row.b, v_row.u, v_n; end if;

    select count(*), min(c.contract_id::text)::uuid, min(cu.name) into v_n, v_contract, v_holder
    from public.contract c left join public.customer cu on cu.id = c.customer_id
    where c.project_id = v_project and c.unit_id = v_unit and c.contract_status = 'ACTIVE';
    if v_n <> 1 then raise exception '%-% 현재 계약이 1건이 아님(%건); 취소', v_row.b, v_row.u, v_n; end if;
    if replace(upper(btrim(coalesce(v_holder, ''))), ' ', '') <> replace(upper(btrim(v_row.holder)), ' ', '') then
      raise exception '%-% 계약자 불일치(DB %, 지시서 %); 취소', v_row.b, v_row.u, v_holder, v_row.holder;
    end if;

    select o.move_in_status::text, o.balance_paid_at into v_status, v_paid
    from public.unit_occupancy_status o
    where o.project_id = v_project and o.unit_id = v_unit and o.contract_id = v_contract
    for update;
    if not found then raise exception '%-% 입주상태 행 없음; 취소', v_row.b, v_row.u; end if;

    v_at := (v_row.paid_on::timestamp at time zone 'Asia/Seoul');

    if v_status in ('MOVED_IN', 'BALANCE_PAID') then
      if v_paid is null then
        update public.unit_occupancy_status
        set balance_paid_at = v_at, updated_at = now(), updated_by = v_member
        where project_id = v_project and unit_id = v_unit and contract_id = v_contract;
        v_filled := v_filled + 1;
      else
        v_skipped := v_skipped + 1;
      end if;
    else
      update public.unit_occupancy_status
      set move_in_status = 'BALANCE_PAID', balance_paid_at = v_at, updated_at = now(), updated_by = v_member
      where project_id = v_project and unit_id = v_unit and contract_id = v_contract;
      insert into public.contract_status_history (
        project_id, contract_id, unit_id, field_changed,
        previous_value, new_value, reason, contact_id, changed_by, changed_at
      ) values (
        v_project, v_contract, v_unit, 'move_in_status',
        v_status, 'BALANCE_PAID', v_reason, null, v_member, now()
      );
      v_applied := v_applied + 1;
    end if;
  end loop;

  raise notice '잔금완납 반영 %세대 / 완납일만 채움 %세대 / 변경 없음 %세대', v_applied, v_filled, v_skipped;
end $$;
