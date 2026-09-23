"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inviteProjectMember } from "@/app/projects/[projectId]/move-in/members/actions";
import { INVITABLE_ROLES, INVITABLE_ROLE_LABEL, type ProjectMemberRow } from "@/lib/move-in/members";

const ERROR_MESSAGE: Record<string, string> = {
  forbidden: "사용자 초대는 현장 관리자만 할 수 있습니다.",
  invalid_input: "이름(2~30자)·이메일·역할을 확인해 주세요.",
  invite_failed: "초대 메일을 보내지 못했습니다. 이메일 주소를 다시 확인해 주세요.",
  duplicate_member: "이미 이 프로젝트에 속한 사용자입니다.",
  unavailable: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

function emptyForm() {
  return { displayName: "", email: "", role: INVITABLE_ROLES[0] as string };
}

export function MemberManagementClient({
  projectId,
  members,
}: {
  projectId: string;
  members: ProjectMemberRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await inviteProjectMember({
      projectId,
      displayName: form.displayName,
      email: form.email,
      role: form.role,
    });
    setPending(false);
    if (!result.ok) {
      setError(ERROR_MESSAGE[result.reason] ?? ERROR_MESSAGE.unavailable);
      return;
    }
    setForm(emptyForm());
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-300">
              <th className="py-2 pr-3 font-medium">이름</th>
              <th className="py-2 pr-3 font-medium">이메일</th>
              <th className="py-2 pr-3 font-medium">역할</th>
              <th className="py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.memberId} className="border-b border-neutral-200">
                <td className="py-2 pr-3">{member.displayName || "—"}</td>
                <td className="py-2 pr-3">{member.email}</td>
                <td className="py-2 pr-3">
                  {member.role === "COUNSELOR" || member.role === "CLIENT_MANAGER"
                    ? INVITABLE_ROLE_LABEL[member.role]
                    : member.role}
                </td>
                <td className="py-2">{member.active ? "활성" : "비활성"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="grid max-w-md gap-3" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold">사용자 초대</h2>
        <label className="flex flex-col gap-1 text-sm">
          이름
          <input
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
            className="rounded border border-neutral-300 px-2 py-1"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded border border-neutral-300 px-2 py-1"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          역할
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {INVITABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {INVITABLE_ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "초대하는 중…" : "초대하기"}
        </button>
      </form>
    </div>
  );
}
