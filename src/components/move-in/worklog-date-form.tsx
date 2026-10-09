export function WorklogDateForm({
  projectId,
  dateYmd,
}: {
  projectId: string;
  dateYmd: string;
}) {
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3"
      action={`/projects/${projectId}/move-in/worklog`}
      method="get"
    >
      <label className="flex flex-col gap-1 text-sm">
        기준일
        <input
          className="border border-neutral-400 px-2 py-1"
          type="date"
          name="date"
          defaultValue={dateYmd}
        />
      </label>
      <button className="border border-neutral-900 bg-neutral-900 px-3 py-1 text-white" type="submit">
        조회
      </button>
    </form>
  );
}
