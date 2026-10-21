-- Stay J 운영 스키마 재구성용 정의 추출 — Supabase SQL Editor용, 읽기 전용(단일 SELECT, 시스템 카탈로그만 조회)
-- DB 비밀번호 없이 대시보드 로그인만으로 실행한다. 테이블 데이터(계약자·개인정보 행)는 읽지 않는다.
-- 대상: public·private 스키마의 타입·시퀀스·테이블·제약·인덱스·뷰·함수·트리거·RLS 정책·권한(GRANT/REVOKE)
-- 결과(ord, kind, name, ddl, total_rows)를 Export > CSV 로 내려받아 C:\StayJ-verify 에 저장하고, 파일 경로만 전달한다.
-- 결과에는 함수 원문이 포함된다(비밀정보 의심 패턴은 받은 쪽에서 건수만 점검, 값은 출력하지 않음).
with
ns as (select oid, nspname from pg_namespace where nspname in ('public', 'private')),
-- 사용자 테이블(확장 소속 제외)
tbl as (
  select c.oid, n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity, c.relacl
  from pg_class c join ns n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'S')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
),
fn as (
  select p.oid, n.nspname, p.proname, p.proacl, p.oid::regprocedure::text as sig
  from pg_proc p join ns n on n.oid = p.pronamespace
  where p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
),
acl_text as (
  -- 권한 → GRANT 문(공개 PUBLIC 포함). 기본 권한이 아닌 상태를 정확히 재현하려고 먼저 모두 회수한다
  select 'table' as target, t.oid, format('%I.%I', t.nspname, t.relname) as obj,
         a.privilege_type, case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end as grantee
  from tbl t, aclexplode(t.relacl) a where t.relacl is not null and t.relkind <> 'S'
  union all
  select 'function', f.oid, f.sig, a.privilege_type, case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end
  from fn f, aclexplode(f.proacl) a where f.proacl is not null
)
-- 결과가 잘리지 않았는지 확인하도록 모든 행에 전체 행 수(total_rows)를 붙인다
select ord, kind, name, ddl, count(*) over () as total_rows from (
-- 10 스키마
select 10 as ord, 'schema' as kind, nspname as name, format('create schema if not exists %I;', nspname) as ddl from ns
union all
select 11, 'schema_grant', n.nspname, format('grant %s on schema %I to %s;', a.privilege_type, n.nspname,
  case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end)
from pg_namespace n, aclexplode(n.nspacl) a
where n.nspname in ('public', 'private') and pg_get_userbyid(a.grantee) not in ('postgres', 'supabase_admin', 'pg_database_owner')
-- 20 열거형 타입
union all
select 20, 'type', format('%I.%I', n.nspname, t.typname),
  format('create type %I.%I as enum (%s);', n.nspname, t.typname,
    (select string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
from pg_type t join ns n on n.oid = t.typnamespace where t.typtype = 'e'
-- 30 시퀀스
union all
select 30, 'sequence', format('%I.%I', t.nspname, t.relname), format('create sequence if not exists %I.%I;', t.nspname, t.relname)
from tbl t where t.relkind = 'S'
-- 40 테이블(컬럼·NOT NULL·기본값). 외래키는 90에서
union all
select 40, 'table', format('%I.%I', t.nspname, t.relname),
  format('create table %I.%I (%s);', t.nspname, t.relname,
    (select string_agg(format('%I %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
        case when a.attidentity in ('a', 'd') then ' generated ' || case a.attidentity when 'a' then 'always' else 'by default' end || ' as identity'
             when a.attgenerated = 's' then ' generated always as (' || pg_get_expr(ad.adbin, ad.adrelid) || ') stored'
             when ad.adbin is not null then ' default ' || pg_get_expr(ad.adbin, ad.adrelid) else '' end,
        case when a.attnotnull then ' not null' else '' end), ', ' order by a.attnum)
     from pg_attribute a left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
     where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped))
from tbl t where t.relkind in ('r', 'p')
-- 50 함수·프로시저(원문 그대로)
union all
select 50, 'function', f.sig, pg_get_functiondef(f.oid) || ';' from fn f
-- 60 기본키·고유·CHECK·EXCLUDE 제약
union all
select 60, 'constraint', format('%I.%I.%I', t.nspname, t.relname, c.conname),
  format('alter table %I.%I add constraint %I %s;', t.nspname, t.relname, c.conname, pg_get_constraintdef(c.oid))
from pg_constraint c join tbl t on t.oid = c.conrelid where c.contype in ('p', 'u', 'c', 'x')
-- 70 뷰
union all
select 70, 'view', format('%I.%I', t.nspname, t.relname), format('create view %I.%I as %s', t.nspname, t.relname, pg_get_viewdef(t.oid))
from tbl t where t.relkind = 'v'
-- 80 인덱스(제약이 만든 인덱스 제외)
union all
select 80, 'index', format('%I.%I', t.nspname, i.relname), pg_get_indexdef(x.indexrelid) || ';'
from pg_index x join pg_class i on i.oid = x.indexrelid join tbl t on t.oid = x.indrelid
where not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
-- 90 외래키
union all
select 90, 'foreign_key', format('%I.%I.%I', t.nspname, t.relname, c.conname),
  format('alter table %I.%I add constraint %I %s;', t.nspname, t.relname, c.conname, pg_get_constraintdef(c.oid))
from pg_constraint c join tbl t on t.oid = c.conrelid where c.contype = 'f'
-- 100 트리거
union all
select 100, 'trigger', format('%I.%I.%I', t.nspname, t.relname, g.tgname), pg_get_triggerdef(g.oid) || ';'
from pg_trigger g join tbl t on t.oid = g.tgrelid where not g.tgisinternal
-- 110 RLS
union all
select 110, 'rls', format('%I.%I', t.nspname, t.relname),
  format('alter table %I.%I enable row level security;', t.nspname, t.relname)
  || case when t.relforcerowsecurity then format(' alter table %I.%I force row level security;', t.nspname, t.relname) else '' end
from tbl t where t.relrowsecurity
union all
select 111, 'policy', format('%I.%I.%I', p.schemaname, p.tablename, p.policyname),
  format('create policy %I on %I.%I as %s for %s to %s%s%s;', p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
    (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(p.roles) r),
    case when p.qual is not null then ' using (' || p.qual || ')' else '' end,
    case when p.with_check is not null then ' with check (' || p.with_check || ')' else '' end)
from pg_policies p where p.schemaname in ('public', 'private')
-- 120 권한: 대상별로 모두 회수한 뒤 실제 권한만 부여
union all
select 120, 'revoke_all', obj, format('revoke all on %s %s from public, anon, authenticated, service_role;', target, obj)
from (select distinct target, obj from acl_text) r
union all
select 121, 'grant', obj || ' ' || grantee, format('grant %s on %s %s to %s;', privilege_type, target, obj, grantee)
from acl_text
union all
select 122, 'column_grant', format('%I.%I.%I', t.nspname, t.relname, a.attname),
  format('grant %s (%I) on table %I.%I to %s;', x.privilege_type, a.attname, t.nspname, t.relname,
    case when x.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(x.grantee)) end)
from tbl t join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped and a.attacl is not null,
  aclexplode(a.attacl) x
) u
order by ord, name;
