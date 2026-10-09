// 화양 3인 실시간 업무일지 전용 섹션: 담당자별 실적 / 등급변경 / 금일 상담 상세.
// snapshot.teamActivity 등은 화양 프로젝트에서만 채워지므로(queries.ts 참고),
// 값이 없으면 아무 것도 렌더링하지 않는다 (다른 프로젝트에서는 이 컴포넌트를 호출해도 무해하게 null).
import type { MoveInWorklogSnapshot } from "@/lib/worklog/snapshot";

const numeric = (value: number) => value.toLocaleString("ko-KR");
const cellClass = "border border-neutral-300 px-3 py-2 text-right tabular-nums whitespace-nowrap";
const leftCellClass = "border border-neutral-300 px-3 py-2 whitespace-nowrap";
const headingClass = "border border-neutral-300 bg-neutral-100 px-3 py-2 font-medium whitespace-nowrap";
const tableClass = "w-full border-collapse text-sm";

export function WorklogTeamActivityView({ snapshot }: { snapshot: MoveInWorklogSnapshot }) {
  const { teamActivity, gradeChanges, consultationDetail } = snapshot;
  if (!teamActivity || !gradeChanges || !consultationDetail) return null;

  // 표시는 프로젝트 업무일(timeZone) 기준. 다음접촉은 날짜가 오늘이 아닐 수 있어 날짜까지 함께 표기한다.
  const formatTime = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: snapshot.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));
  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: snapshot.timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="6. 담당자별 실적">
        <h2 className="mb-3 text-lg font-semibold">6. 담당자별 실적</h2>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>{["담당자", "전화", "방문", "문자", "기타", "총 상담"].map((h) => <th key={h} scope="col" className={headingClass}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {teamActivity.rows.map((row) => (
                <tr key={row.memberId}>
                  <th scope="row" className={headingClass}>{row.displayName}</th>
                  <td className={cellClass}>{numeric(row.call)}</td>
                  <td className={cellClass}>{numeric(row.visit)}</td>
                  <td className={cellClass}>{numeric(row.message)}</td>
                  <td className={cellClass}>{numeric(row.other)}</td>
                  <td className={cellClass}>{numeric(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <th scope="row" className={headingClass}>합계</th>
                <td className={cellClass}>{numeric(teamActivity.total.call)}</td>
                <td className={cellClass}>{numeric(teamActivity.total.visit)}</td>
                <td className={cellClass}>{numeric(teamActivity.total.message)}</td>
                <td className={cellClass}>{numeric(teamActivity.total.other)}</td>
                <td className={cellClass}>{numeric(teamActivity.total.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-label="7. 등급변경">
        <h2 className="mb-3 text-lg font-semibold">7. 등급변경</h2>
        <p className="mb-3 text-sm">
          등급변경 {gradeChanges.totalChanges}건
          {gradeChanges.transitions.length > 0 ? " / " : ""}
          {gradeChanges.transitions.map((t) => `${t.from} → ${t.to} ${t.count}`).join(" / ")}
          {gradeChanges.newEvaluations > 0 ? ` · 신규평가 ${gradeChanges.newEvaluations}건 (등급변경 건수 미포함)` : ""}
        </p>
        {gradeChanges.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead><tr>{["시간", "담당자", "동호수", "변경"].map((h) => <th key={h} scope="col" className={headingClass}>{h}</th>)}</tr></thead>
              <tbody>
                {gradeChanges.rows.map((row) => (
                  <tr key={row.consultationId}>
                    <td className={leftCellClass}>{formatTime(row.consultedAt)}</td>
                    <td className={leftCellClass}>{row.displayName}</td>
                    <td className={leftCellClass}>{row.unitLabel}</td>
                    <td className={leftCellClass}>{row.from} → {row.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">금일 등급변경이 없습니다.</p>
        )}
      </section>

      <section aria-label="8. 금일 상담 상세">
        <h2 className="mb-3 text-lg font-semibold">8. 금일 상담 상세</h2>
        {consultationDetail.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>{["시간", "담당자", "동호수", "채널", "등급변경", "상담내용", "다음접촉"].map((h) => <th key={h} scope="col" className={headingClass}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {consultationDetail.map((row) => (
                  <tr key={row.consultationId}>
                    <td className={leftCellClass}>{formatTime(row.consultedAt)}</td>
                    <td className={leftCellClass}>{row.displayName}</td>
                    <td className={leftCellClass}>{row.unitLabel ?? "—"}</td>
                    <td className={leftCellClass}>{row.channel}</td>
                    <td className={leftCellClass}>{row.previousGrade && row.newGrade ? `${row.previousGrade} → ${row.newGrade}` : (row.newGrade ?? "—")}</td>
                    <td className={leftCellClass}>{row.content ?? "—"}</td>
                    <td className={leftCellClass}>{row.nextActionAt ? formatDateTime(row.nextActionAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">금일 상담 데이터가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
