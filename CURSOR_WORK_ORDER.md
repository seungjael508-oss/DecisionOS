# Cursor 작업 지시

Cursor는 이 저장소의 구현 담당자다. 아래 문서를 순서대로 완전히 읽고 작업한다.

1. `docs/superpowers/specs/2026-08-27-decisionos-mvp-phase1-design.md`
2. `docs/architecture/phase1-schema-and-entities.md`
3. `docs/superpowers/plans/2026-08-27-decisionos-mvp-phase1.md`
4. `/Users/apple/Downloads/DecisionOS_논리스키마_v1.2.md`

## 실행 규칙

- 계획의 Task 1부터 순서대로 한 Task만 수행한다.
- 테스트를 먼저 작성하고 실패를 확인한 뒤 최소 구현으로 통과시킨다.
- 각 Task가 끝날 때 테스트 결과와 diff를 제시하고 멈춘다.
- 사용자가 Codex 검수를 요청해 승인받기 전 다음 Task로 넘어가지 않는다.
- Cursor가 스키마, 권한, RPC 경계 또는 범위를 임의로 바꾸지 않는다.
- 구현 중 설계 충돌이나 공식 문서와의 차이를 발견하면 코드를 추측해서 작성하지 말고 근거와 선택지를 보고한다.
- 별도 API 서버, Prisma/Drizzle, Import, AI, funnel, report, `TEAM_LEAD` 권한은 추가하지 않는다.
- 브라우저와 애플리케이션 코드에 service-role 키를 절대 넣지 않는다.

## 첫 명령

다음 문장으로 시작한다.

> DecisionOS Phase 1 설계서와 구현 계획을 모두 읽었습니다. 지금은 Task 1만 수행하겠습니다. 완료 후 테스트 결과와 변경 파일을 제시하고 Codex 검수를 기다리겠습니다.
