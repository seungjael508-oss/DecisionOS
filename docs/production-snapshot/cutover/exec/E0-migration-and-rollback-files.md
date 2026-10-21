# [E0] 실행 SQL 목록 — 마이그레이션·롤백 (실행하지 않음, 승인 단계에서만)

원문은 복사하지 않고 저장소 파일을 그대로 쓴다. 실행 직전 SHA-256이 아래와 같은지 확인한다(다르면 실행하지 않는다).
확인 명령: `sha256sum <파일>`

## 적용 순서 (SQL Editor에서 파일 전체를 한 번에 실행, 각 파일은 begin…commit 단일 트랜잭션)

| 순서 | 파일 | SHA-256 |
|---|---|---|
| A1 | supabase/migrations/20261015100000_today_queue_cd_focus.sql | 48771d42aad2e6d3e4512089a5d5781d1e5e18d4ba6f7c5641a3b6f27cdaaf37 |
| A2 | supabase/migrations/20261017100000_absence_streak_visit_target.sql | baa6846dae4a588293c9dc4fc5139b879f579310ae47f408cfa458870850c039 |
| A3 | supabase/migrations/20261017110000_consultation_d_grade_admin_guard.sql | ef4af9cb23f1736981209dcdebbbb25d77fc9725c8393f9213747d56d8d8108b |
| A4 | supabase/migrations/20261017120000_absence_auto_d_grade.sql | e0a7d529d32c19b7f2b20a826e88fafcade6d804d5e55e7d41a0b56eda5895c5 |

- 각 파일의 사전 점검(preflight)이 실패하면 그 파일은 아무것도 바꾸지 않고 롤백된다. 실패하면 다음 파일로 넘어가지 않고 중단한다(런북 중단 조건 S3).
- A1·A2 사전 점검은 오늘(KST) 처리 기록이 있으면 실패한다(01에서 미리 확인).

## 롤백 순서 (코드를 먼저 되돌린 뒤에만, 역순)

| 순서 | 파일 | SHA-256 |
|---|---|---|
| R1 | supabase/rollback/20261017120000_absence_auto_d_grade.rollback.sql | 326038acb735d214f359bb29fb6f84651d7910630aede2b20484425dddeccc2a |
| R2 | supabase/rollback/20261017110000_consultation_d_grade_admin_guard.rollback.sql | db003387971885b2406eb220d0f7d6bf52cb04e66020dfd7351d1c91b2eba89b |
| R3 | supabase/rollback/20261017100000_absence_streak_visit_target.rollback.sql | f8fce382d3f179c1f2efaa6becb3d3aef2f94172e8fe2a934d71b3f163377928 |
| R4 | supabase/rollback/20261015100000_today_queue_cd_focus.rollback.sql | 8959b1dd9c9b557f02d6bda914dc0f9e4e5d69e8a3fcba837924e3dde882cf98 |

- R3은 move_in_visit_target 테이블과 행을 삭제한다. **R3 전에 E1(백업) + 05c(PASS)가 반드시 필요하다.**
- A2는 contract_status_history.field_changed CHECK에 'legacy_grade'를 추가한다(기존 4개 값 유지, 기존 이력 미수정).
  R3은 이 CHECK를 운영 원본 4개 값 정의로 되돌리는데, **'legacy_grade' 이력이 1건이라도 있으면 R3 전체가 중단**된다(아무것도 바뀌지 않음).
  자동 D 전환이 한 번이라도 일어난 뒤에는 R3을 실행할 수 없으므로, 그때는 R1·R2 부분 롤백까지만 하고 R3 처리 방법은 별도 승인으로 정한다.
- 롤백은 자동 D등급·등급 이력·상담 기록을 되돌리지 않는다(운영 기록, 임의 복원 금지).
- 부분 롤백도 가능: 자동 전환만 멈추려면 R1만, 상담사 D 제한까지 풀려면 R1·R2(이 경우 방문대상·C·D 집중관리는 유지).

## 데이터 백업·복구

- E1-backup-visit-targets.EXEC.sql — R3 전 방문대상 백업
- E2-restore-visit-targets.EXEC.sql — A2 재적용 후 방문대상 복구

## 2차 적용 (2026-10-19, 장기 부재 규칙·조회 지연 수정)

| 순서 | 파일 | SHA-256 |
|---|---|---|
| A5 | supabase/migrations/20261019100000_absence_streak_rule_fast_path.sql | f8c9a94bf9294e8f2abd2509687c3107a9f1d2e81de4d7616e019f119e7fdebd |
| R5 | supabase/rollback/20261019100000_absence_streak_rule_fast_path.rollback.sql | 0b2511dd86ae24287ef543c3a4c1d086e431f81180f75707daaeade961781aa7 |

- 선행: A1~A4 적용 완료(운영 2026-10-19 12:4x). 사전 점검: 20261017120000 정의, 오늘 처리 기록 0건.
- 코드: dpl_537YLX96VHhw3T2XwPZ14UWCqksa(도메인 미연결). 코드·DB는 어느 순서로 적용해도 호환되지만, 규칙 일치를 위해 A5 직후 승격한다.
- 롤백: 코드 dpl_Ysf2DeZNKYdcgMVazUAD4gzkPXKU 재승격 → 필요 시 R5(데이터 변경 없음).

## 3차 적용 (2026-10-19 작성, 오늘 관리대상 업무 처리: 완료·다음 관리일·다음 방문일)

| 순서 | 파일 | SHA-256 |
|---|---|---|
| A6 | supabase/migrations/20261019110000_today_task_completion.sql | efad6d5d407c6c6b6d863cd3a17e0f69e32366adbea47999c041874f6bbc5158 |
| R6 | supabase/rollback/20261019110000_today_task_completion.rollback.sql | bd42d3aefd39a07f159acc29ed09ef89f6d3bf990d968d7b6f5d6f40b6114636 |

- 선행: A5 적용 완료(07-postcheck-a5.sql 판정 9행 PASS). A6 사전 점검이 A5 정의를 확인하고, 아니면 아무것도 바꾸지 않고 중단한다.
- 사전 점검: 오늘(KST) 처리 기록(move_in_tracking_disposition)이 1건이라도 있으면 중단 → **현장 처리 시작 전(출근 전)에만 적용**. 01-precheck-dispositions-today.sql로 미리 확인.
- 적용 후 확인: 09-postcheck-a6.sql 판정 13행 PASS(2026-10-19 문자 판정 수정본 확인 항목 포함). 수정 전 파일 SHA 20f3861c…는 폐기 — 실행 금지.
- 바뀌는 것: 함수 정의만(새 테이블 없음). 추가 3개 — private.move_in_absence_candidates_for_unit, private.move_in_today_queue(3인자), public.record_move_in_visit_result(7인자). 교체 3개 — public.get_move_in_today_queue(2인자, 같은 열), public.complete_or_snooze_move_in_tracking, public.record_move_in_visit_result(6인자, 7인자 래퍼). 기존 시그니처·ACL 유지. 상담·등급·이력 데이터는 바꾸지 않는다.
- 코드 호환:
  - 기존 코드 + A6 DB: 호환(6인자 방문 결과·2인자 오늘 관리대상 유지). 완료 처리 RPC는 이미 관리대상이 아닌 세대에 오류 대신 null을 돌려준다.
  - **신규 코드(DecisionOS-today: 다음 방문일·오늘 업무 완료) + A6 이전 DB: 불가** — 방문 결과 저장이 7인자(p_next_visit_at)를 호출하므로 실패한다. 반드시 A6 → 09 PASS → 코드 승격 순서.
- 코드: 신규 배포 ID 미생성(승인 후 만들고 여기에 기록, 운영 도메인 미연결 상태로).
- 롤백: **코드 먼저** A6 적용 직전 운영 배포(기록한 ID) 재승격 → 필요 시 R6. 신규 코드가 남은 채 R6을 실행하면 방문 결과 저장이 실패한다.
  - R6은 3개 함수를 A5 시점 정의로 되돌리고 추가 3개를 삭제한다. 처리 기록(move_in_tracking_disposition) 행과 다음 방문일로 저장된 연락 일정·상담은 운영 기록이므로 지우지 않는다.
  - R6 후 다음 관리일 미루기('R:' 지문) 기록은 이전 규칙의 어떤 세대와도 맞지 않아 영향이 없다.

## 4차 적용 (2026-10-19 작성, 운영 조회 성능: RLS 반복 평가·오늘 관리대상 반복 계산 제거)

| 순서 | 파일 | SHA-256 |
|---|---|---|
| A8 | supabase/migrations/20261019120000_rls_membership_set.sql | faf819336541eda192aae702b397589c45f08953fe034729a148a570f047c530 |
| A9 | supabase/migrations/20261019130000_today_queue_materialize.sql | 39f10315ef8db91b4cfd628b9e098beca481a39a7d308f18fda9b4157e9b60fb |
| R9 | supabase/rollback/20261019130000_today_queue_materialize.rollback.sql | 28cf60aa40372afea489986816ab49a33178147d339baedcf640bd88c36fbd9a |
| R8 | supabase/rollback/20261019120000_rls_membership_set.rollback.sql | 93d6f20841a25bad9f397a5a02abd345656f1dd93f60964bd5d43859fc6ebfe0 |

- 근거: 운영 EXPLAIN(상담사 권한) 10,500ms — 오늘 관리대상 RPC 6,505ms, consultation 2,631ms, customer 508ms, project_unit·contract·점유 각 229~247ms.
- A8: 비용이 측정된 5개 테이블의 SELECT 정책 7개만 조건을 "현재 사용자 소속 목록(쿼리당 1회)" 비교로 변경. 권한 의미 동일(사용자 13종 격리 검증). 원문은 verification/a8-policies-original.json, 생성기 gen-a8-rls.mjs.
- A9: private.move_in_today_queue의 CTE 2개에 MATERIALIZED만 추가(본문 2줄 차이). 판정·지문 동일 → 처리 기록 조건 없음. 생성기 gen-a9-queue-materialize.mjs.
- 사전 점검: A8은 정책 7개의 원문 md5·명령·역할·PERMISSIVE·WITH CHECK와 원본 함수 정의, A9는 A6 수정본 정의가 아니면 변경 없이 중단.
- 적용 후 확인: cutover/11-postcheck-a8-a9.sql 판정 9행 PASS → perf-explain-by-role.sql 상담사·관리자 재측정.
- 코드 호환: 앱 코드 변경 없음(현행·신규 배포 모두 호환). 데이터 변경 없음.
- 롤백: R9 → R8(각각 함수·정책 정의만 원복, 데이터 변경 없음).

## 5차 적용 (2026-10-20 작성, 비밀번호 재설정 세션의 DB 접근 차단) — 미적용, Preview·운영 각각 별도 승인

| 순서 | 파일 | SHA-256 |
|---|---|---|
| A13 | supabase/migrations/20261020120000_recovery_session_membership_block.sql | 8e365d2ab0097cd8105b9b4f0665908f3bc24cbd9971e5a43caf6c934c12ddae |
| R13 | supabase/rollback/20261020120000_recovery_session_membership_block.rollback.sql | 98b3029f64f4f09c0e7023674cf889a5ec33718f6220c75d98617281e6e5fc4d |

- 근거: 재설정 링크로 만든 세션(JWT amr=recovery)이 일반 로그인과 같은 DB 권한(고객·전화번호 조회, 상담 저장). 앱의 /reset-password 강제 이동은 Data API 직접 호출을 막지 못함(verification/iso-recovery-session-access.mjs로 재현).
- 바뀌는 것: private.current_project_member_id·private.current_project_memberships 두 함수에 "amr에 recovery 없음" 조건 1줄씩. 시그니처·SECURITY DEFINER·STABLE·search_path·소유자·ACL·정책·데이터는 그대로.
- 선행: A8(소속 목록 함수). 파일 이름 시각은 A12(20261021100000)보다 앞서지만 A12와 같은 객체를 바꾸지 않아 순서 무관(check-rollback-chain.mjs로 확인). A12 적용 여부와 별개로 적용할 수 있다.
- 사전 점검: 두 함수 원문 md5가 운영 원문(c13d4513…)·A8 정의(a365bc18…)가 아니면, 또는 A8 미적용이면 변경 없이 중단. 중복 적용도 중단.
  - 2026-10-21 수정: 운영 A8 소속 목록 함수 원문에 SQL Editor 붙여 넣기로 CR 14개가 남아 있어(CR 제거 md5 = a365bc18…) 원문 md5 비교로 중단됨(변경 없음).
    사전 점검을 13-precheck와 같은 CR 제거 비교로 바꿈(함수 본문 변경 없음). 수정 전 SHA 2be3f3ac…는 폐기 — 실행 금지.
    격리 검증: CRLF A8 재현 상태에서 수정 전 동일 오류 중단·수정 후 적용·13-postcheck 8행 PASS·R13·알 수 없는 정의 중단(13건), check-rollback-chain 11건, iso-recovery-membership-block 69건 PASS.
- 적용 전 확인(읽기 전용): cutover/13-precheck-a13.sql(SHA-256 f9e3dda59928e9356cce5f5400531552b0db7dbc12df84d6c0c0badb9c779cd0) OVERALL = READY일 때만 적용. ALREADY = 이미 적용, STOP = 적용하지 않고 회신. 격리 DB에서 A8 미적용·A8 적용·A13 적용·알 수 없는 정의 4상태 판정 확인.
- 대상 확인: SQL Editor를 연 대시보드 URL의 프로젝트 ref가 승인된 대상과 같은지 실행 전에 확인한다. 2026-10-20 Vercel 변수 확인 결과 NEXT_PUBLIC_SUPABASE_URL은 Production에만 있고, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY는 Production·Preview 공용(= 운영 프로젝트 키)이다. 별도 Preview DB를 쓰려면 Preview 전용 URL·키를 따로 지정해야 한다.
- 적용 후 확인: cutover/13-postcheck-a13.sql 판정 8행 PASS(SHA-256 d90fcacae68fffeffb52cb01cdeb3a1951062b27c09ed369fc5fab420ccaefa9). 실제 차단은 재설정 메일 E2E로 확인.
- 격리 검증: verification/iso-recovery-membership-block.mjs(69건: 복구 세션 = 소속 없는 사용자, 일반 로그인·초대·otp·amr 없음은 RLS 테이블 29개·RPC 결과 불변, 롤백 md5 복원), check-rollback-chain.mjs(운영 스키마 전체 체인 A1~A6·A8~A11·A13 역순 롤백 후 함수·정책·제약·컬럼·트리거·인덱스 동일).
- 코드 호환: 앱 코드 변경 없음. 현행 코드에서는 복구 세션이 프로젝트 화면에 들어가도 보이는 행 없음·저장 거부(42501)가 되고, 신규 코드(proxy)는 복구 세션을 /reset-password로 보낸다. 비밀번호 변경(GoTrue)·초대(amr=invite)·서버 키 경로 영향 없음.
- 롤백: R13(함수 정의만 원복, 데이터 변경 없음). **A8까지 되돌릴 때는 반드시 R13 → R9 → R8 순서.** R8 사전 점검은 A13 여부를 보지 않으므로, R13 없이 R8을 실행하면 current_project_member_id에 recovery 제외 조건이 남은 채 A8만 롤백된다(이후 R13은 소속 목록 함수가 없어 중단).
