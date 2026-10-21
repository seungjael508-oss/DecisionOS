"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { retryTodayTask } from "@/app/projects/[projectId]/move-in/today/actions";

/** 저장은 됐지만 오늘 업무 완료 처리만 실패했을 때의 재시도. 상담을 다시 저장하지 않는다. */
export function TodayTaskRetry({ projectId, unitId, nextAt, doneHref }: {
  projectId: string;
  unitId: string;
  nextAt: string | null;
  /** 성공 후 이동할 주소(알림 파라미터 제거). 없으면 새로고침만 */
  doneHref?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onRetry() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    const result = await retryTodayTask({ projectId, unitId, nextAt }).catch(() => ({ ok: false, message: "완료 처리를 다시 하지 못했습니다. 잠시 후 다시 시도해 주세요." }));
    busy.current = false;
    setPending(false);
    setMessage({ ok: result.ok, text: result.message });
    if (result.ok) {
      if (doneHref) router.replace(doneHref);
      else router.refresh();
    }
  }

  return <span className="inline-flex flex-wrap items-center gap-2">
    <button type="button" onClick={onRetry} disabled={pending} className="border border-neutral-900 px-2 py-1 text-sm disabled:opacity-50">
      {pending ? "처리 중…" : "완료 처리 다시 시도"}
    </button>
    {message ? <span role="status" className={`text-sm ${message.ok ? "text-neutral-800" : "text-red-700"}`}>{message.text}</span> : null}
  </span>;
}
