import { describe, expect, it } from "vitest";
import { isRecoverySession, recoveryForwardUrl } from "@/lib/auth/recovery-forward";

describe("복구 세션 판정(비밀번호 변경 전 프로젝트 차단)", () => {
  it("amr에 recovery가 있으면 시간과 무관하게 복구 세션", () => {
    expect(isRecoverySession({ amr: [{ method: "recovery", timestamp: 1 }] })).toBe(true);
    expect(isRecoverySession({ amr: [{ method: "password", timestamp: 1 }, { method: "recovery", timestamp: 2 }] })).toBe(true);
  });
  it("일반 로그인·초대·클레임 없음은 복구 세션이 아니다", () => {
    expect(isRecoverySession({ amr: [{ method: "password", timestamp: 1 }] })).toBe(false);
    expect(isRecoverySession({ amr: [{ method: "otp", timestamp: 1 }] })).toBe(false);
    expect(isRecoverySession({ amr: "recovery" })).toBe(false);
    expect(isRecoverySession({})).toBe(false);
    expect(isRecoverySession(null)).toBe(false);
  });
});

const at = (path: string) => recoveryForwardUrl(new URL(path, "https://stayj.co.kr"));

describe("재설정 링크가 Site URL(/?code=)로 돌아온 경우", () => {
  it("code·sb_flow_id만 /auth/recovery로 넘긴다", () => {
    const target = at("/?code=abc&sb_flow_id=f1&next=https://evil.example");
    expect(target?.origin).toBe("https://stayj.co.kr");
    expect(target?.pathname).toBe("/auth/recovery");
    expect([...target!.searchParams.keys()].sort()).toEqual(["code", "sb_flow_id"]);
    expect(target?.searchParams.get("code")).toBe("abc");
  });
  it("Supabase가 error를 붙여 보내면 교환하지 않도록 error 표시를 유지한다", () => {
    expect(at("/?code=abc&error=access_denied")?.searchParams.has("error")).toBe(true);
  });
  it("code가 없거나 루트가 아니면 개입하지 않는다", () => {
    expect(at("/")).toBeNull();
    expect(at("/?code=")).toBeNull();
    expect(at("/projects?code=abc")).toBeNull();
    expect(at("/auth/recovery?code=abc")).toBeNull();
  });
});
