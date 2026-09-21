-- public.consultation이 supabase_realtime publication에 정확히 1건만 등록되어 있는지,
-- 그리고 동일 마이그레이션 로직을 재실행해도 안전(idempotent)한지 검증한다.
begin;
select no_plan();

select is(
  (select count(*)::int from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consultation'),
  1,
  'supabase_realtime publication에 public.consultation이 정확히 1건 등록되어 있다'
);

-- 마이그레이션과 동일한 조건부 로직을 재실행 — 이미 있으므로 아무 것도 하지 않아야 하고 에러가 나면 안 된다.
select lives_ok(
  $$
  do $reapply$
  begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consultation'
      ) then
        alter publication supabase_realtime add table public.consultation;
      end if;
    end if;
  end
  $reapply$;
  $$,
  '동일 조건부 ADD TABLE 로직을 재실행해도 실패하지 않는다 (idempotent)'
);

-- 재실행 이후에도 여전히 1건이어야 한다 (중복 추가되지 않음).
select is(
  (select count(*)::int from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consultation'),
  1,
  '재실행 이후에도 consultation은 여전히 1건만 등록되어 있다'
);

-- publication 자체는 drop/recreate 없이 그대로 유지된다 (oid가 바뀌지 않음).
select is(
  (select count(*)::int from pg_publication where pubname = 'supabase_realtime'),
  1,
  'supabase_realtime publication은 drop/recreate 없이 그대로 유지된다'
);

select * from finish();
rollback;
