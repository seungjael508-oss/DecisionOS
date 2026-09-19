import { formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import type { UnitListRow } from "@/lib/move-in/filters";

// 인쇄 화면 전용 표. CustomerPhone의 마스킹/토글 UI 대신 원문 전화번호를 그대로 출력한다.
// 프로젝트명을 표시하려면 별도 조회가 필요해 P1 "추가 Supabase 조회 금지" 원칙을 어기므로 고정 제목만 쓴다.
export function UnitPrintTable({
  filterSummary,
  rows,
}: {
  filterSummary: string;
  rows: UnitListRow[];
}) {
  return (
    <div className="hidden print:block">
      <h1 className="text-lg font-bold">동호수 관리 현황</h1>
      <p className="mb-3 text-sm">
        필터 조건: {filterSummary} · 결과 {rows.length}세대
      </p>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-black">
            {["동호수", "계약자", "전화번호", "현재등급", "최근상담", "최근접촉", "다음접촉"].map((label) => (
              <th key={label} className="border-b border-black py-1 pr-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.unitId} className="border-b border-neutral-400 align-top">
              <td className="py-1 pr-3 whitespace-nowrap">{formatUnitLabel(row.buildingNo, row.unitNo)}</td>
              <td className="py-1 pr-3">{row.customerName ?? "—"}</td>
              <td className="py-1 pr-3">{row.customerPhone ?? "—"}</td>
              <td className="py-1 pr-3">{row.latestGrade ?? "미확인"}</td>
              <td className="max-w-xs py-1 pr-3 line-clamp-2 whitespace-pre-wrap break-words">
                {row.latestConsultation ?? "상담 이력 없음"}
              </td>
              <td className="py-1 pr-3">{formatDateTime(row.lastContactAt)}</td>
              <td className="py-1">{formatDateTime(row.nextContactAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
