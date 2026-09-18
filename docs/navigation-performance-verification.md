# 메뉴 전환 성능 검수 — 2026-09-18

## 기준 및 측정 한계

사용자 제공 기존 기준: 동호수 목록 약 **3.245초**, Dashboard 약 **1.898초**.
이 두 수치의 계정/역할, cold/warm, 측정 종료 지점은 이 작업에서 확인하지 못했다.
따라서 아래 도구의 결과와 동일 조건이라고 단정하거나 개선율을 계산하지 않는다.
배포가 승인되면 배포 직전 기존 Production에서 Before를 기록하고, 서울 리전 배포 완료 후 같은 절차로 After를 기록한다.
현재 **커밋·push·배포 없이 중단**하므로 Production After는 미측정이다.

## 동일 조건 재측정

```sh
node scripts/measure-production-navigation.mjs before /private/tmp/decisionos-perf-before.json
# 별도 승인된 배포 후에만:
node scripts/measure-production-navigation.mjs after /private/tmp/decisionos-perf-after.json
```

- 같은 PC, Chrome 버전, 네트워크, 계정/역할, 화양 프로젝트, 필터 없음, 동일 데이터량을 유지한다. Before/After 사이에 데이터 이관·권한·고객 배정 변경을 하지 않는다.
- 도구가 연 Chrome에서 측정자가 직접 로그인한 뒤 터미널 Enter. 비밀번호/쿠키/토큰을 도구에 입력하거나 파일로 저장하지 않는다.
- 로그인 완료 후 같은 origin의 빈 테스트 페이지에서 인증된 GET만 실행한다. 앱의 링크 prefetch와 화면 렌더 경합을 제거한다.
- HTTP cache는 no-store. 동호수 목록 → Dashboard 순서로 직렬 요청하고 요청 사이 1초 간격을 둔다.
- 페이지별 warm-up 1회는 따로 남기고 이후 10회의 전체 HTML 응답 완료 시간을 측정한다. 스트리밍 응답의 첫 바이트나 loading fallback만으로 완료 처리하지 않는다.
- 실제 콘텐츠 제목을 확인한다. 로그인 redirect, HTTP 오류, 권한 거부/데이터 오류 페이지는 측정 실패다.
- median/p95/min/max, 각 표본, 응답 바이트 수를 JSON에 기록한다. 본문·고객 개인정보·인증정보는 기록하지 않는다. 결과 파일은 기존 파일을 덮어쓰지 않는다.
- 이 지표는 인증된 전체 HTML 응답 시간이다. 실제 메뉴 클릭부터 클라이언트 렌더 완료까지의 시간은 별도 브라우저 지표이며 섞어서 비교하지 않는다.
- 재측정 기록에는 계정의 익명 별칭과 역할, 데이터 건수, 양쪽 deployment ID, `vercel inspect`로 확인한 리전, 측정 시각을 함께 남긴다. 리전은 `vercel.json` 값만으로 적용됐다고 보고하지 않는다.
- 기존 3.245초/1.898초의 측정 방법이 다르면 참고값으로만 유지하고 도구로 수집한 Before/After끼리 비교한다. 로딩 UI 효과는 개선율에 포함하지 않는다.

## 요청 내 권한 조회 Before / After

실제 React Server Components 렌더러, 실제 React cache를 사용한다. Supabase 네트워크 경계만 synthetic fixture로 대체한다.
Before는 Production 커밋 `ded8559`의 원본 함수, After는 로컬 수정 함수다.

```sh
node --conditions=react-server tests/fixtures/move-in-access-rsc.mjs --before
node --conditions=react-server tests/fixtures/move-in-access-rsc.mjs
```

동일 프로젝트에 대해 3개 서버 컴포넌트가 검사할 때:

| 검사 | Before | After |
| --- | ---: | ---: |
| getUser | 3 | 1 |
| 활성 project_member 조회 | 3 | 1 |
| project 조회 | 3 | 1 |
| 합계 SDK 호출 | 9 | 3 |

이는 fixture에서 관측한 SDK 호출 수다. 실제 네트워크 요청 수, 모든 메뉴의 동일한 호출 수, 운영 시간 67% 개선을 의미하지 않는다.
다른 사용자 요청, 다른 프로젝트, 다음 요청에서 회수된 멤버십, 비인증 요청을 테스트한다.
권한검사·active 조건·사용자/프로젝트 조건·RLS는 유지한다. 프로세스 전역 Map, TTL cache, Next 영속 data cache는 추가하지 않는다.

## 리전과 예상 효과

- 확인한 Production 함수: 미국 동부 `iad1`; Supabase DB: 서울 `ap-northeast-2`.
- 로컬 `vercel.json`: `regions: ["icn1"]`로 서울 지정. 아직 운영 미적용.
- 예상: 서버↔DB 장거리 왕복을 줄이고 동일 렌더 내 중복 권한 조회를 줄인다. 실제 초 단위 개선은 서울 배포 후 측정 전까지 미확정이다.
- `src/app/loading.tsx`는 기다리는 동안 응답 상태를 알리는 체감 개선이다. 서버 데이터 조회 속도 개선으로 집계하지 않는다. 기존 move-in loading UI는 유지했다.

## 변경 범위 및 검증

1. `vercel.json`
2. `src/lib/move-in/access.ts`
3. `src/app/loading.tsx`
4. `tests/fixtures/move-in-access-rsc.mjs`
5. `tests/unit/move-in-access-dedupe.test.ts`
6. `scripts/measure-production-navigation.mjs`
7. 이 문서

전체 tests: 55개 파일 / 347개 테스트 PASS. tsc / lint / webpack build / diff check PASS.
측정 도구는 문법·help 확인만 수행했고 실제 인증된 Production 계정으로 Before/After를 실행하지 않았다.
Production DB 쓰기 없음. 전화번호/화양 이관/DB migration/schema/기타 기존 작업은 변경하지 않았다.
