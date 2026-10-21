// Supabase가 redirectTo를 허용 목록에서 찾지 못하면 재설정 링크가 Site URL(/?code=…)로 돌아온다.
// 이때 code·sb_flow_id만 기존 교환 경로(/auth/recovery)로 넘긴다. 다른 입력(next 등)은 버린다.
// 교환·recovery 세션 확인·실패 화면은 /auth/recovery가 그대로 담당한다.
// 재설정 링크로 만든 세션(amr에 recovery)은 시간과 무관하게 비밀번호 변경 전까지 프로젝트에 들어가지 못한다.
// 변경 성공 시 resetPassword가 로그아웃하므로 이후에는 새 비밀번호 로그인 세션(amr=password)만 남는다.
export function isRecoverySession(claims: { amr?: unknown } | null | undefined): boolean {
  const methods = claims?.amr;
  return Array.isArray(methods) && methods.some((entry: unknown) =>
    typeof entry === "object" && entry !== null && "method" in entry && entry.method === "recovery");
}

export function recoveryForwardUrl(url: URL): URL | null {
  if (url.pathname !== "/") return null;
  const code = url.searchParams.get("code");
  if (!code) return null;
  const target = new URL("/auth/recovery", url);
  target.searchParams.set("code", code);
  const flowId = url.searchParams.get("sb_flow_id");
  if (flowId !== null) target.searchParams.set("sb_flow_id", flowId);
  if (url.searchParams.has("error")) target.searchParams.set("error", "1");
  return target;
}
