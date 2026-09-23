// Task A-2: inviteProjectMember() 서버 액션. PROJECT_ADMIN 게이팅, Auth Admin API 호출 순서,
// "이미 존재하는 이메일" 폴백, 그리고 초대 실패 시 project_member RPC를 절대 호출하지 않는지
// (orphan 방지)를 검증한다. RPC 자체의 권한/역할 제한 로직은
// supabase/tests/database/invite_project_member.test.sql(pgTAP)에서 이미 검증한다.
import { beforeEach, expect, it, vi } from "vitest";
import { inviteProjectMember } from "@/app/projects/[projectId]/move-in/members/actions";

const state = vi.hoisted(() => ({
  ok: true,
  role: "PROJECT_ADMIN",
  rpc: vi.fn(),
  inviteUserByEmail: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("@/lib/move-in/access", () => ({
  requireMoveInAccess: async () => (state.ok ? { ok: true, role: state.role, memberId: "member" } : { ok: false }),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerClient: async () => ({ rpc: state.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { inviteUserByEmail: state.inviteUserByEmail, listUsers: state.listUsers } },
  }),
}));

const validInput = {
  projectId: "1283e198-5043-4027-96d6-edcc7a6686c6",
  displayName: "임효묵",
  email: "dhhwayang@naver.com",
  role: "CLIENT_MANAGER",
};

beforeEach(() => {
  state.ok = true;
  state.role = "PROJECT_ADMIN";
  state.rpc.mockReset().mockResolvedValue({ data: "new-member-id", error: null });
  state.inviteUserByEmail.mockReset().mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null });
  state.listUsers.mockReset().mockResolvedValue({ data: { users: [] }, error: null });
});

it("PROJECT_ADMIN이 신규 이메일을 초대하면 Admin API 호출 후 RPC를 정확히 1회 호출한다", async () => {
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: true, memberId: "new-member-id" });
  expect(state.inviteUserByEmail).toHaveBeenCalledTimes(1);
  expect(state.inviteUserByEmail).toHaveBeenCalledWith("dhhwayang@naver.com", {
    data: { display_name: "임효묵" },
    redirectTo: "https://stayj.co.kr/auth/confirm",
  });
  expect(state.rpc).toHaveBeenCalledTimes(1);
  expect(state.rpc).toHaveBeenCalledWith("invite_project_member", {
    p_project_id: validInput.projectId,
    p_user_id: "new-user-id",
    p_role: "CLIENT_MANAGER",
    p_display_name: "임효묵",
  });
});

it("CLIENT_MANAGER/COUNSELOR는 Admin API를 호출하기도 전에 거부된다", async () => {
  state.role = "CLIENT_MANAGER";
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: false, reason: "forbidden" });
  expect(state.inviteUserByEmail).not.toHaveBeenCalled();
  expect(state.rpc).not.toHaveBeenCalled();
});

it("잘못된 이메일 형식은 Admin API 호출 전에 거부된다", async () => {
  const result = await inviteProjectMember({ ...validInput, email: "not-an-email" });
  expect(result).toEqual({ ok: false, reason: "invalid_input" });
  expect(state.inviteUserByEmail).not.toHaveBeenCalled();
});

it("표시이름이 2자 미만이면 Admin API 호출 전에 거부된다", async () => {
  const result = await inviteProjectMember({ ...validInput, displayName: "a" });
  expect(result).toEqual({ ok: false, reason: "invalid_input" });
  expect(state.inviteUserByEmail).not.toHaveBeenCalled();
});

it("초대 가능하지 않은 역할(PROJECT_ADMIN 등)은 Admin API 호출 전에 거부된다", async () => {
  const result = await inviteProjectMember({ ...validInput, role: "PROJECT_ADMIN" });
  expect(result).toEqual({ ok: false, reason: "invalid_input" });
  expect(state.inviteUserByEmail).not.toHaveBeenCalled();
});

it("이미 존재하는 이메일이면 새로 만들지 않고 listUsers로 찾은 기존 user_id로 연결한다", async () => {
  state.inviteUserByEmail.mockResolvedValue({
    data: { user: null },
    error: { code: "email_exists", status: 422, message: "Email already registered" },
  });
  state.listUsers.mockResolvedValue({
    data: { users: [{ id: "existing-user-id", email: "dhhwayang@naver.com" }] },
    error: null,
  });
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: true, memberId: "new-member-id" });
  expect(state.rpc).toHaveBeenCalledWith("invite_project_member", expect.objectContaining({
    p_user_id: "existing-user-id",
  }));
});

it("Admin API가 '이미 존재' 외의 이유로 실패하면 project_member RPC를 호출하지 않는다(orphan 방지)", async () => {
  state.inviteUserByEmail.mockResolvedValue({
    data: { user: null },
    error: { code: "unexpected_failure", status: 500, message: "boom" },
  });
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: false, reason: "invite_failed" });
  expect(state.rpc).not.toHaveBeenCalled();
});

it("이미 존재한다고 했지만 listUsers 스캔에서 못 찾으면 RPC를 호출하지 않는다(orphan 방지)", async () => {
  state.inviteUserByEmail.mockResolvedValue({
    data: { user: null },
    error: { code: "email_exists", status: 422, message: "Email already registered" },
  });
  state.listUsers.mockResolvedValue({ data: { users: [] }, error: null });
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: false, reason: "invite_failed" });
  expect(state.rpc).not.toHaveBeenCalled();
});

it("RPC가 unique violation(23505)을 반환하면 duplicate_member로 매핑한다", async () => {
  state.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } });
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: false, reason: "duplicate_member" });
});

it("RPC가 그 외 오류를 반환하면 unavailable로 매핑한다", async () => {
  state.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "not authorized" } });
  const result = await inviteProjectMember(validInput);
  expect(result).toEqual({ ok: false, reason: "unavailable" });
});
