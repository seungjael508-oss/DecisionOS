# Stay J 운영 스키마 전용 덤프(데이터 행 없음) — 권한 있는 담당자가 직접 실행한다.
# - 운영에 보내는 명령은 pg_dump(읽기 전용 트랜잭션의 카탈로그 조회)뿐이다. --schema-only로 테이블 데이터는 받지 않는다.
# - 비밀번호는 화면·파일·명령행에 남기지 않는다(PGPASSWORD 환경변수로만 pg_dump에 전달, 명령행에는 비밀번호 없는 주소).
# - SSL 필수(sslmode=require). 연결 대상(사용자@호스트) 확인 + 덤프 내용으로 Stay J 운영 DB인지 재확인한다.
# - pg_dump가 쓰는 bin 폴더 전체(실행 파일·DLL)를 SHA-256 매니페스트(pg17-bin.sha256)로 검증한다.
# - 덤프에 비밀정보 의심 패턴이 있으면 건수만 알리고, 경로 전달을 멈추게 한다(값은 출력하지 않음).
# 실행: PowerShell에서
#   powershell -ExecutionPolicy Bypass -File C:\Users\PC-1\DecisionOS-dev\docs\production-snapshot\verification\dump-schema.ps1
param(
  [string]$OutDir = "C:\StayJ-verify",
  [string]$PgBin = "C:\Users\PC-1\tools\pgsql17\pgsql\bin"
)
$ErrorActionPreference = "Stop"

# 1) 실행 파일 출처·무결성: EDB 공식 zip(https://get.enterprisedb.com/postgresql/postgresql-17.5-1-windows-x64-binaries.zip,
#    zip SHA-256 795196df1b2855fd0c7fb52629c6cc16acaa85819912e732bd4c46863e77eb30)의 bin. 서명이 없어 매니페스트로 확인한다.
$manifest = Join-Path $PSScriptRoot "pg17-bin.sha256"
$expected = @{}
foreach ($line in Get-Content -Encoding UTF8 $manifest) { if ($line -match "^([0-9A-F]{64})\s+(.+)$") { $expected[$Matches[2]] = $Matches[1] } }
$actual = Get-ChildItem $PgBin -File
if ($actual.Count -ne $expected.Count) { throw "bin 파일 수 불일치($($actual.Count)/$($expected.Count)) — 실행 중단" }
foreach ($f in $actual) {
  if ((Get-FileHash $f.FullName -Algorithm SHA256).Hash -ne $expected[$f.Name]) { throw "SHA-256 불일치: $($f.Name) — 실행 중단" }
}
$pgDump = Join-Path $PgBin "pg_dump.exe"
Write-Host "pg_dump: $(& $pgDump --version) / bin $($actual.Count)개 SHA-256 확인"

# 2) 보관 폴더: Git 저장소·동기화 폴더 금지, 실행할 때마다 본인만 접근하도록 권한 고정
$full = [IO.Path]::GetFullPath($OutDir)
if ($full -match "OneDrive|Dropbox|Google Drive|iCloud") { throw "동기화 폴더에는 저장하지 않습니다: $full" }
$probe = $full
while ($probe) {
  if (Test-Path (Join-Path $probe ".git")) { throw "Git 저장소 안에는 저장하지 않습니다: $probe" }
  $parent = Split-Path $probe -Parent
  if (-not $parent -or $parent -eq $probe) { break }
  $probe = $parent
}
if (-not (Test-Path $full)) { New-Item -ItemType Directory -Path $full | Out-Null }
icacls $full /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" | Out-Null

# 3) 연결 정보: 화면에 표시하지 않고 입력받아 비밀번호를 분리한다
Write-Host ""
Write-Host "Supabase 대시보드 > DecisionOS 운영 프로젝트 > Connect > Session pooler(포트 5432) 연결 문자열을"
Write-Host "비밀번호를 넣은 상태로 붙여 넣으세요. 입력 내용은 화면에 표시되지 않습니다."
$secure = Read-Host "연결 문자열" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$out = $null
try {
  $conn = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ($conn -notmatch "^(postgres(?:ql)?://)([^:@/]+)(?::([^@]*))?@([^/?]+)(/[^?]*)?(\?.*)?$") { throw "연결 문자열 형식이 아닙니다(postgresql://사용자:비밀번호@호스트:포트/DB)." }
  $scheme = $Matches[1]; $user = $Matches[2]; $pass = $Matches[3]; $hostPort = $Matches[4]; $db = $Matches[5]; $query = $Matches[6]
  if (-not $pass) { throw "연결 문자열에 비밀번호가 없습니다." }
  if (-not $db) { $db = "/postgres" }
  if ($hostPort -notmatch ":5432$") { throw "Session pooler(포트 5432) 주소가 아닙니다." }
  # 대상 확인(비밀이 아닌 사용자@호스트만 표시). Supabase 사용자 이름은 postgres.<프로젝트 ref>
  Write-Host ""
  Write-Host "연결 대상: $user@$hostPort$db"
  $answer = Read-Host "대시보드의 DecisionOS 운영 프로젝트 ref와 위 사용자 이름(postgres. 뒤)이 같으면 yes 입력"
  if ($answer -ne "yes") { throw "연결 대상 확인 취소 — 실행하지 않았습니다." }
  $out = Join-Path $full ("stayj-schema-" + (Get-Date -Format "yyyyMMdd_HHmm") + ".sql")
  $exclude = "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault"
  $env:PGPASSWORD = [Uri]::UnescapeDataString($pass)
  if ($query -notmatch "sslmode=") { $env:PGSSLMODE = "require" }
  # 명령행에는 비밀번호 없는 주소만 넘긴다
  & $pgDump "--dbname=$scheme$user@$hostPort$db$query" --schema-only --quote-all-identifiers --role=postgres --lock-wait-timeout=10000 "--exclude-schema=$exclude" "--file=$out"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump 실패(종료 코드 $LASTEXITCODE). 연결 문자열·네트워크를 확인하세요." }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  $conn = $null; $pass = $null; $secure = $null
}

# 4) 결과 점검(값은 출력하지 않고 건수만)
$text = Get-Content -Raw -Encoding UTF8 $out
$count = { param($pattern) ([regex]::Matches($text, $pattern, "IgnoreCase, Multiline")).Count }
$dataLines = & $count "^(COPY |INSERT INTO )"
# Stay J 운영 DB 확인: 상담 저장 RPC(20261009 원문 표식)·오늘 관리대상 처리 기록 테이블이 있어야 한다
$isStayJ = (& $count 'FUNCTION "public"\."create_move_in_consultation"') -gt 0 -and (& $count '부재는 실제 접촉이 아니므로') -gt 0 `
  -and (& $count 'TABLE "public"\."move_in_tracking_disposition"') -gt 0
# 비밀정보 의심 패턴(함수 본문·외부 서버 연결 정의). 값은 출력하지 않는다
$secretHits = (& $count 'USER MAPPING') + (& $count 'eyJ[A-Za-z0-9_-]{20,}\.') + (& $count 'sk_(live|test)_[A-Za-z0-9]{10,}') `
  + (& $count 'sb_secret_[A-Za-z0-9_-]{10,}') + (& $count 'Bearer [A-Za-z0-9._-]{20,}') + (& $count "(password|passwd|secret|api_?key|token)\s*[:=]\s*'[^']{8,}'")

Write-Host ""
Write-Host "파일: $out"
Write-Host ("크기: {0:N0} bytes / SHA-256: {1}" -f (Get-Item $out).Length, (Get-FileHash $out -Algorithm SHA256).Hash)
Write-Host "데이터 행(COPY/INSERT): $dataLines  (0이어야 함)"
Write-Host "테이블: $(& $count '^CREATE TABLE ') / 함수: $(& $count '^CREATE (OR REPLACE )?FUNCTION ') / RLS 활성화: $(& $count 'ENABLE ROW LEVEL SECURITY') / 정책: $(& $count '^CREATE POLICY ') / GRANT: $(& $count '^GRANT ') / REVOKE: $(& $count '^REVOKE ')"
Write-Host "Stay J 운영 DB 확인(상담 저장 RPC 20261009·처리 기록 테이블): $isStayJ"
Write-Host "비밀정보 의심 패턴: $secretHits  (0이어야 함)"
Write-Host ""
if ($dataLines -ne 0 -or -not $isStayJ -or $secretHits -ne 0) {
  Write-Warning "점검 실패 — 경로를 전달하지 말고 이 결과 줄만 알려 주세요. 파일은 이 PC에 둔 채 다른 곳으로 옮기지 마세요: $out"
} else {
  Write-Host "점검 통과 — 전달할 것: 위 '파일:' 경로 한 줄과 점검 줄들. 파일 내용·연결 문자열은 붙여 넣지 마세요."
}
