-- 업무일지 실시간 반영을 위해 public.consultation 변경을 Realtime으로 발행한다.
-- 기존 supabase_realtime publication은 drop/recreate하지 않고 유지한 채 consultation만 조건부로 추가한다.
-- 이미 등록되어 있으면 아무 것도 하지 않으므로 재적용해도 실패하지 않는다. 다른 테이블은 건드리지 않는다.
do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'consultation'
    ) then
      alter publication supabase_realtime add table public.consultation;
    end if;
  end if;
end
$pub$;
