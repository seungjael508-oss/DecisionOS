"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateMoveInFieldMemberDisplayName } from "@/app/projects/[projectId]/move-in/assign/actions";
import { isValidFieldMemberDisplayName, UNKNOWN_FIELD_MEMBER_LABEL } from "@/lib/move-in/assign";
import type { FieldMemberName } from "@/lib/move-in/queries";

function FieldMemberRow({
  projectId,
  member,
}: {
  projectId: string;
  member: FieldMemberName;
}) {
  const router = useRouter();
  const [name, setName] = useState(member.displayName ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!isValidFieldMemberDisplayName(name)) {
      setError("이름은 2~30자로 입력해주세요.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await updateMoveInFieldMemberDisplayName({
      projectId,
      memberId: member.memberId,
      displayName: name,
    });
    setPending(false);
    if (!result.ok) {
      setError("이름 수정에 실패했습니다.");
      return;
    }
    setName(result.displayName);
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-neutral-200 py-2">
      <span className="w-32 text-sm text-neutral-600">
        {member.displayName ?? UNKNOWN_FIELD_MEMBER_LABEL}
      </span>
      <input
        aria-label={`${member.displayName ?? UNKNOWN_FIELD_MEMBER_LABEL} 표시 이름`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="border border-neutral-400 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => void onSubmit()}
        className="border border-neutral-800 px-3 py-1 text-sm"
      >
        수정
      </button>
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </li>
  );
}

// PROJECT_ADMIN만 접근 가능한 "상담사 관리" 섹션. 렌더링 여부는 상위(page.tsx)에서
// access.role로 걸러도, 실제 이름 변경 권한은 서버 액션에서 다시 검증한다.
export function FieldMemberNameEditor({
  projectId,
  members,
}: {
  projectId: string;
  members: FieldMemberName[];
}) {
  if (members.length === 0) return null;

  return (
    <section className="mb-8 border border-neutral-300 p-4">
      <h2 className="mb-3 text-lg font-semibold">상담사 관리</h2>
      <ul>
        {members.map((member) => (
          <FieldMemberRow key={member.memberId} projectId={projectId} member={member} />
        ))}
      </ul>
    </section>
  );
}
