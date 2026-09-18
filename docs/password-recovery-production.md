# Production 비밀번호 재설정 연결 검수

검수일: 2026-09-18. 사용자 승인에 따라 Supabase URL Configuration 저장 상태를 새로고침 후 확인했다. Production 배포, 메일 발송, 실제 사용자 비밀번호 변경은 수행하지 않았다.

## 현재 확인 결과

- 작업 저장소: `/Users/apple/Documents/Codex/2026-08-26/files-mentioned-by-the-user-decisionos/decisionos`.
- 기존 로컬 forgot/reset 폼·페이지와 `/auth/recovery`를 재사용했다. 별도의 인증 시스템이나 DB 변경은 없다.
- 2026-09-18 비인증 GET으로 Production `/reset-password`가 HTTP 200이며 만료 안내를 표시하는 것을 확인했다. 따라서 현재 Production에 페이지가 없다는 가정은 사실로 단정할 수 없다. 배포된 코드와 이번 변경의 동일성은 확인하지 않았다. Dashboard URL 설정은 아래 값으로 저장된 것을 확인했다.
- 기존 작업 트리에는 전화번호/이관 등 다른 작업과 기존 staged 파일이 있다. 이 작업에서 stage·commit·push·배포하지 않았다. 전체 작업 트리를 그대로 배포하지 말고 아래 인증 변경을 별도 검토해야 한다.

## 최종 경로

`https://stayj.co.kr/login`
→ 비밀번호를 잊으셨나요?
→ `https://stayj.co.kr/forgot-password`
→ `resetPasswordForEmail(email, { redirectTo: "https://stayj.co.kr/auth/recovery" })`
→ Supabase recovery 이메일의 확인 링크
→ `https://stayj.co.kr/auth/recovery?code=...`
→ 같은 브라우저의 PKCE verifier로 `exchangeCodeForSession`
→ `https://stayj.co.kr/reset-password`
→ 서버에서 recovery 재확인 후 비밀번호 저장
→ 현재 세션 로그아웃 및 로그인 링크.

기존 클라이언트는 `window.location.origin`을 사용한다. 따라서 Production 요청은 반드시 `https://stayj.co.kr/forgot-password`에서 시작해야 한다. Preview/localhost에서 요청한 메일은 해당 origin으로 돌아간다. 인증 코드가 호스트 사이를 이동하도록 redirect를 강제로 바꾸지 않았다.

## Supabase Dashboard에 필요한 값

Authentication → URL Configuration:

| 항목 | 값 |
| --- | --- |
| Site URL | `https://stayj.co.kr` |
| Redirect URLs: Production, 저장 확인 | `https://stayj.co.kr/auth/recovery` |
| Redirect URLs: 기존 주소, 유지 확인 | `https://decisionos-blush.vercel.app/auth/recovery` |
| 로컬 3000 개발 시에만 추가 | `http://localhost:3000/auth/recovery` |

기존 다른 인증 흐름의 allowlist는 삭제하지 않는다. `/reset-password`는 앱 내부 최종 이동 경로이므로 이번 PKCE 흐름의 `redirectTo`에 직접 넣지 않는다. Production에는 광범위한 `https://**` wildcard를 추가하지 않는다.

설치된 auth-js의 `appendPkceFlowIdToRedirects` 실험 기능은 기본 비활성이다. callback은 `sb_flow_id`가 전달되는 경우 SDK에 전달하도록 보완했다. 이후 이 기능을 활성화한다면 정확한 callback 외에 `https://stayj.co.kr/auth/recovery?sb_flow_id=*` allowlist가 필요할 수 있으므로 함께 검증한다.

Authentication → Email Templates → Reset Password:

- 기본 `{{ .ConfirmationURL }}` 확인 링크를 사용한다. `{{ .SiteURL }}` 또는 앱 루트로 직접 보내는 링크로 대체하지 않는다.
- 이 구현은 앱에서 시작한 PKCE recovery용이다. Dashboard의 **Send password recovery**는 앱 브라우저에서 PKCE 요청을 시작하지 않으므로 같은 흐름이라고 가정하지 않는다. 직원은 배포 검증 이후 앱의 비밀번호 찾기를 사용한다.
- 이메일은 요청한 브라우저에서 열어야 한다. 다른 브라우저/기기나 verifier가 없는 링크는 만료 안내로 종료한다.
- Dashboard의 Site URL과 위 두 Redirect URLs는 저장 후 새로고침으로 확인했다. 메일 템플릿과 SMTP 설정은 이번에 검증하지 않았다.

## 보완 사항

- callback은 code 교환 성공만으로 허용하지 않고 Supabase `getUser()`와 서명 검증된 `getClaims()`를 통해 같은 사용자 및 최근 recovery AMR을 확인한다.
- 일반 password 로그인, 누락/검증 실패/다른 사용자/오래된 recovery claim은 거절한다. `user_metadata`, URL query, 클라이언트 상태는 인증 근거로 사용하지 않는다.
- 재설정 화면과 저장 Server Action 모두 같은 경계를 적용한다. recovery 확인 후 15분 내 저장해야 하며, 만료 시 새 메일을 요청한다.
- 저장은 기존 Supabase `updateUser`를 Server Action에서 호출한다. 화면이 열린 뒤 세션이 바뀌어도 저장 시 다시 검증한다.
- 성공 후 서버 및 브라우저의 현재 세션을 `scope: local`로 로그아웃한다. 로그아웃 실패와 비밀번호 저장 실패를 구분한다. 모든 기기의 세션이 즉시 폐기된다고 보장하지 않는다.
- callback 목적지는 고정 내부 경로다. 로그인 `next`도 역슬래시·제어문자·외부 origin을 거부한다.
- Supabase 원문 오류, 코드, 토큰, 비밀번호를 사용자 메시지에 포함하지 않는다. callback은 `private, no-store`와 `no-referrer`를 설정한다.
- 계정 존재 여부는 메일 요청 성공 메시지로 노출하지 않는다.

## 파일 범위

기존 파일 수정:

- `src/app/auth/recovery/route.ts`
- `src/app/reset-password/page.tsx`
- `src/components/auth/reset-password-form.tsx`
- `src/components/auth/login-form.tsx`
- `tests/unit/password-recovery-route.test.ts`
- `tests/unit/password-recovery.test.tsx`
- `tests/unit/reset-password-page.test.tsx`

신규:

- `src/lib/auth/recovery.ts`
- `src/app/reset-password/actions.ts`
- `tests/unit/recovery-boundary.test.tsx`
- `tests/unit/reset-password-action.test.ts`
- 이 문서

기존 `src/app/forgot-password/page.tsx`, `src/components/auth/forgot-password-form.tsx`는 검수 후 그대로 재사용했다. 배포 대상에는 이 기존 로컬 파일들도 포함되어야 한다.

## 검증

- 수정 전 신규 회귀 테스트: 10개 중 7개 실패. 일반 세션 허용과 외부 redirect 우회가 재현됨.
- `npm test -- --run`: 54개 파일, 346개 테스트 통과.
- `npx tsc --noEmit --incremental false`: 통과.
- `npm run lint`: 통과.
- `git diff --check`: 통과.
- `npm run build`: Turbopack CSS 처리 하위 프로세스의 포트 바인딩 `EPERM`으로 실패. 권한 재시도에서도 동일함.
- `npm run build -- --webpack`: Production 빌드 통과. `/auth/recovery`, `/forgot-password`, `/reset-password` 포함 확인.
- Supabase 경계는 테스트에서 mock했다. 실제 메일 발송·code 교환·새 비밀번호 로그인은 아직 수행하지 않았다.

## 승인된 배포 이후 확인할 순서

1. 인증 변경 파일만 포함된 배포 결과와 위 Dashboard 값을 확인한다.
2. 본인 계정으로 Production 비밀번호 찾기에서 메일을 한 번 요청한다.
3. 같은 브라우저에서 링크를 열어 `/reset-password`까지 이동하는지 확인한다.
4. 새 비밀번호 저장 후 로그인 화면에서 새 비밀번호로 로그인한다.
5. 만료·재사용 링크와 일반 로그인 세션의 재설정 접근이 거절되는지 확인한다.
6. 본인 계정 검증 후 직원 각자가 자기 이메일로 동일한 흐름을 이용한다. 관리자가 타인의 비밀번호를 정하거나 메일을 대신 사용하지 않는다.

참고: [Supabase Password Auth](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [JWT Claims](https://supabase.com/docs/guides/auth/jwt-fields).

## P0 커밋 검토 범위 (14개 파일)

아래 목록은 현재 HEAD 대비 신규/수정 파일 전체를 포함한다. 기존 index에는 범위 밖 파일도 staged되어 있으므로 `git commit -a` 또는 전체 staged 일괄 커밋을 사용하지 않는다. 이번 준비에서는 index를 변경하지 않는다.

```text
src/app/auth/recovery/route.ts
src/app/forgot-password/page.tsx
src/app/reset-password/page.tsx
src/app/reset-password/actions.ts
src/components/auth/forgot-password-form.tsx
src/components/auth/reset-password-form.tsx
src/components/auth/login-form.tsx
src/lib/auth/recovery.ts
tests/unit/password-recovery-route.test.ts
tests/unit/password-recovery.test.tsx
tests/unit/reset-password-page.test.tsx
tests/unit/recovery-boundary.test.tsx
tests/unit/reset-password-action.test.ts
docs/password-recovery-production.md
```

커밋 제목 제안: `fix: secure production password recovery flow`

전화번호 편집·공식원장/이관·Supabase generated types·migration·DB 테스트 변경은 이 커밋에서 제외한다. 인증 변경은 기존 Supabase client와 환경변수를 재사용하며 새 패키지·환경변수·Schema·migration이 필요 없다. 로컬 전체 작업 트리 검증과 실제 배포할 커밋의 CI 검증은 구분한다. 기본 Turbopack 빌드의 기존 환경 오류가 있으므로 webpack 통과만으로 기본 배포 빌드가 검증되었다고 판단하지 않는다.
