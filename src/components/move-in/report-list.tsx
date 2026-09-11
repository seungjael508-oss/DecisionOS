import { WorklogSnapshotView } from "@/components/move-in/worklog-snapshot-view";
import {
  asWorklogSnapshot,
  latestMoveInReportId,
  supersededVersion,
  type MoveInReportRow,
} from "@/lib/move-in/reports";
import { formatDateTime } from "@/lib/move-in/labels";
import { formatWorklogDateLabel } from "@/lib/worklog/day-range";

export function ReportList({ rows }: { rows: MoveInReportRow[] }) {
  const latestId = latestMoveInReportId(rows);

  return (
    <ul className="flex flex-col gap-4" aria-label="일일 입주촉진 보고서">
      {rows.map((row) => {
        const snapshot = asWorklogSnapshot(row.generatedData);
        const previousVersion = supersededVersion(rows, row.supersedesReportId);
        const isLatest = row.reportId === latestId;
        return (
          <li key={row.reportId}>
            <details
              open={isLatest}
              className="border border-neutral-300 p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {formatWorklogDateLabel(row.reportDate)} · v{row.version}
                {isLatest ? " · 최신" : ""}
              </summary>
              <p className="mt-3 text-sm text-neutral-600">
                생성 {formatDateTime(row.generatedAt)}
                {previousVersion
                  ? ` · v${previousVersion} 보고서를 대체`
                  : " · 최초 버전"}
              </p>
              {snapshot ? (
                <div className="mt-6">
                  <WorklogSnapshotView snapshot={snapshot} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-neutral-700">
                  보고서 내용을 표시할 수 없습니다.
                </p>
              )}
            </details>
          </li>
        );
      })}
    </ul>
  );
}
