-- 격리 PostgreSQL에 운영 스키마 전용 덤프를 복원하기 전, Supabase 플랫폼이 제공하던 최소 기반을 만든다.
-- supabase db dump(스키마)는 auth·extensions·storage 등 내부 스키마를 제외하고,
-- --role-only 는 anon·authenticated·service_role 등 예약 역할을 제외하므로(2.115.0 --dry-run으로 확인) 여기서 만든다.
-- 실제 사용자·비밀값은 넣지 않는다. 두 번 실행해도 안전(멱등).

-- 1) 예약 역할(로그인 불가). 운영 비밀번호·속성은 재현하지 않는다
do $roles$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'authenticator', 'supabase_admin',
                           'supabase_auth_admin', 'supabase_storage_admin', 'dashboard_user', 'pgbouncer'] loop
    begin
      execute format('create role %I nologin', r);
    exception when duplicate_object then null;
    end;
  end loop;
end
$roles$;
grant anon, authenticated, service_role to authenticator;

-- 2) extensions 스키마(덤프가 extensions."gen_random_bytes" 등을 참조)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- 3) auth 스키마 최소 정의(public FK가 auth.users(id)를 참조, RLS·RPC가 auth.uid() 사용)
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);
-- Supabase와 같이 request.jwt.claim.sub(구) 또는 request.jwt.claims(신)의 sub를 읽는다
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
