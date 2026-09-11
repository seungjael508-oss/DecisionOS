"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { generateMoveInDailyReport } from "@/app/projects/[projectId]/move-in/reports/actions";

export function ReportGenerateForm({
  projectId,
  dateYmd,
}: {
  projectId: string;
  dateYmd: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date") ?? "").trim();
    setPending(true);
    setError(false);
    const result = await generateMoveInDailyReport({ projectId, date });
    setPending(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 flex flex-wrap items-end gap-3"
      aria-label="일일 보고서 생성"
    >
      <label className="flex flex-col gap-1 text-sm">
        기준일
        <input
          className="border border-neutral-400 px-2 py-1"
          type="date"
          name="date"
          defaultValue={dateYmd}
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white disabled:opacity-50"
      >
        {pending ? "생성 중…" : "보고서 생성"}
      </button>
      {error ? (
        <p className="text-sm text-red-800">보고서를 만들지 못했습니다.</p>
      ) : null}
    </form>
  );
}
