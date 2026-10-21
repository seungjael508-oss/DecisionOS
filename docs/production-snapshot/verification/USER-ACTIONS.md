# Stay J 운영 검증 — 사용자 조치 안내 (2026-10-17)

Claude는 운영 접속정보·관리자 키·개인정보 파일을 다루지 않는다. 아래는 권한이 있는 담당자가 직접 실행할 절차다.
결과는 **파일 경로 또는 PASS/FAIL 줄만** 전달한다(파일 내용·비밀번호·연결 문자열은 붙여 넣지 않는다).

## 0. 전환점검 01·03 (읽기 전용, 지금 실행 가능)

- 01: `docs/production-snapshot/cutover/01-precheck-dispositions-today.sql`
- 03: `docs/production-snapshot/cutover/03-baseline-db-state.sql`
- 확인 결과(정적 검토): 둘 다 단일 SELECT. 03의 'INSERT/UPDATE/DELETE'는 권한 이름 문자열일 뿐 쓰기 문장이 아님.
  01의 move_in_tracking_disposition(project_id, tracking_date)은 운영 적용된 20261009 함수가 이미 사용하는 컬럼.
  03은 운영에 없는 move_in_visit_target을 존재 확인 후에만 조회(현재 운영에서는 n/a, 로컬 리허설 확인).
- 기대: 01 = 오류 없이 1행(PASS 또는 STOP 모두 정상), 03 = 오류 없이 표 출력, mig_20261009 = true, 나머지 mig_* = false
- 02는 전환 당일까지 실행하지 않는다.

## 1. 운영 스키마 전용 덤프 (데이터 없음)

### 가장 간단한 방법 — 스크립트 1개 (이 PC에 준비 완료, Docker 불필요)
- 준비됨: PostgreSQL 17.5 pg_dump(EDB 공식 zip, `C:\Users\PC-1\tools\pgsql17\pgsql\bin`, SHA-256 고정 확인)
- 실행(PowerShell):
```
powershell -ExecutionPolicy Bypass -File C:\Users\PC-1\DecisionOS-dev\docs\production-snapshot\verification\dump-schema.ps1
```
- 묻는 것: (1) Supabase 대시보드 > DecisionOS 운영 프로젝트 > Connect > **Session pooler(5432)** 연결 문자열(비밀번호 포함, 화면에 안 보임) (2) 표시된 `postgres.<ref>@호스트`가 운영 프로젝트 ref와 같으면 `yes`.
- 보안: 비밀번호는 명령행·파일에 남지 않음(환경변수로만 전달 후 삭제), SSL 필수, bin 68개 SHA-256 검증, 덤프로 Stay J DB 여부·비밀정보 패턴 재확인(실패 시 경로 전달 금지 안내).
- 결과: `C:\StayJ-verify\stayj-schema-YYYYMMDD_HHMM.sql`(본인만 접근, Git·동기화 폴더 거부) + 점검 줄
  (데이터 행 0, 테이블·함수·RLS·정책·GRANT·REVOKE 건수, 상담 저장 RPC·오늘 관리대상 함수 포함 여부, SHA-256)
- 로컬 시험: 같은 옵션으로 테스트 DB를 덤프 → 데이터 0행, 함수·RLS·정책·권한 포함, auth 제외 → 기초 SQL과 함께 빈 DB 복원 성공(권한 유지)
- 아래 방법 A·B는 대안이다.

### 보관 폴더(본인만 접근, 동기화 폴더 금지)
```
mkdir C:\StayJ-verify
icacls C:\StayJ-verify /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"
```

### 방법 A — Supabase CLI(2.115.0 이상) + Docker Desktop
빈 작업 폴더(저장소 밖, 예: C:\StayJ-verify\cli)에서 실행한다. link는 그 폴더에 supabase\.temp를 만든다.
```
cd C:\StayJ-verify\cli
npx supabase@2.115.0 login
npx supabase@2.115.0 link --project-ref <프로젝트 ref>
npx supabase@2.115.0 db dump --linked -f C:\StayJ-verify\stayj-schema.sql
npx supabase@2.115.0 db dump --linked --role-only -f C:\StayJ-verify\stayj-roles.sql
```
- link가 DB 비밀번호를 물으면 터미널에만 입력한다(대화창에 붙여 넣지 않음).
- 스키마 덤프에서 빠지는 것: auth·extensions·storage 등 내부 스키마. 역할 덤프에서 빠지는 것: anon·authenticated 등 예약 역할과 비밀번호. GRANT/REVOKE는 덤프에 포함된다. 빠지는 부분은 이쪽 기초 SQL(isolated-supabase-bootstrap.sql)로 채운다.

### 방법 B — Docker 없이(PostgreSQL 17 클라이언트 pg_dump)
CLI가 내부적으로 쓰는 것과 같은 옵션이다. `--dry-run` 출력에는 비밀번호가 들어 있으므로 공유하지 않는다.
```
pg_dump "<세션 풀러 연결 문자열>" --schema-only --quote-all-identifiers ^
  --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" ^
  -f C:\StayJ-verify\stayj-schema.sql
```
- 권한 검증이 필요하므로 `--no-privileges`·`--no-owner`를 붙이지 않는다.

### 전달과 삭제
- 전달: `C:\StayJ-verify\stayj-schema.sql` 처럼 **경로만** 알려 준다.
- Claude 쪽 검증 순서: 기초 SQL → 덤프 복원 → 사전 점검 포함 마이그레이션 4개 → 실제 pgTAP 4종(기존 실패 5건 재판정) → 17·18인자·RLS·ACL·IDOR → 다중 세션 경합 → 역순 롤백·재적용(check-rollback-chain.mjs) → 전환점검 03·04
- 검증이 끝나면 덤프 파일과 로컬 격리 DB를 삭제한다.

## 2. 실제 데이터 Production build (개인정보 파일 3개가 이미 있는 보존 환경에서만)

새 PC로 데이터 파일을 내려받거나 Git에 추가하지 않는다.
```
REM (1) 보존 환경에서 기준 커밋 + MVP 기준본 반영
git checkout 74653fcfdc8a399f90b5154bdeb8c3bbae68e6ed
REM   C:\Users\PC-1\DecisionOS-mvp-baseline-20261017\modified\ 와 untracked\ 내용을 저장소 루트에 덮어쓰기
sha256sum -c <기준본 폴더>\working-tree.sha256        (57개 모두 OK)

REM (2) 데이터 파일 3개가 제자리에 있는지 확인(내용은 열지 않음)
dir src\lib\move-in\contract-address-data.server.ts src\lib\move-in\ledger-management-data.server.ts src\lib\move-in\payment-projection-source.server.ts

REM (3) 빌드와 점검
npm ci
npm run build
node docs/production-snapshot/verification/check-private-data-exposure.mjs .
```
- 전달: `npm run build` 마지막 10줄(성공/실패)과 점검 스크립트의 PASS/FAIL 줄만.
- 점검 스크립트는 값을 출력하지 않는다(파일 존재·Git 추적·이력·클라이언트 번들 표식 건수).

## 3. 개인정보 접근 권한 (Vercel)

- Vercel 대시보드 → 팀 Settings → Members: 구성원 수와 역할(Owner/Member/Viewer 등)만 확인해 전달.
- 배포 소스(Source 탭)에 개인정보 파일 3개가 포함되므로, 접근이 필요 없는 구성원은 정리한다.

## 이후

1·2·3 결과를 받으면 GO/NO-GO 보고서를 작성한다. GO 판정이 나와도 Production DB 마이그레이션과 Vercel 운영 승격은 각각 별도 승인 대상이다.
