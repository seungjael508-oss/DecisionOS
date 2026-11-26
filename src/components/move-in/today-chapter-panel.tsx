import Link from "next/link";
import { changeTerminationReview } from "@/app/projects/[projectId]/move-in/today/termination-actions";
import { isConfirmedBalancePaid } from "@/lib/move-in/balance-paid";
import { formatDateTime, formatUnitLabel } from "@/lib/move-in/labels";
import { buildMoveInUnitDetailHref } from "@/lib/move-in/return-to";
import { loadOperationalLedgerRows } from "@/lib/move-in/ledger-queries.server";
import { floorplanReservationFor } from "@/lib/move-in/floorplan-reservations.server";
import { loadFloorplanScheduleBadges } from "@/lib/move-in/floorplan-schedule.server";
import { loadTerminationReviews } from "@/lib/move-in/termination-review.server";
import { matchTodayChapter, matchesTerminationUnit, normalizeTerminationUnitQuery, todayChapterHref, TODAY_CHAPTERS, type TodayChapter } from "@/lib/move-in/today-chapters";
import { QueryError } from "@/components/move-in/status-copy";

export async function TodayChapterPanel({projectId,chapter,mayReview,reviewNotice,unitSearch}:{
  projectId:string; chapter:Exclude<TodayChapter,"grade">; mayReview:boolean; reviewNotice:string|null; unitSearch?:string|null;
}) {
  const now=new Date();
  const ledger=await loadOperationalLedgerRows(projectId,now);
  if(ledger.error) return <QueryError/>;
  const dateChapter=chapter==="balance"||chapter==="move"||chapter==="unconfirmed";
  const [schedules,reviews]=await Promise.all([
    dateChapter ? loadFloorplanScheduleBadges(projectId,ledger.rows,now,"today") : null,
    chapter==="termination" && mayReview ? loadTerminationReviews(projectId) : null,
  ]);
  const latest=new Map(reviews?.rows.map(r=>[`${r.unit_id}:${r.contract_id}`,r])??[]);
  const rows=ledger.rows.flatMap(row=>{
    const reservation=floorplanReservationFor(row);
    const dates=schedules?.dates.get(row.unitId);
    const review=latest.get(`${row.unitId}:${row.currentContractId}`);
    const e={paid:isConfirmedBalancePaid(row),balancePlan:!!dates?.balance,
      reservation:reservation.moveReservation==="BOOKED",movePlan:!!(row.plannedMoveInDate||dates?.moveIn),
      moved:!!row.actualMoveInDate,review:review?.active,terminationIntent:row.effectiveIntent==="TERMINATION",
      sale:row.effectiveIntent==="SALE_TRANSFER"};
    if(!matchTodayChapter(chapter,e)) return [];
    return [{row,reservation,dates,review,e}];
  });
  const search=chapter==="termination"?normalizeTerminationUnitQuery(unitSearch):"";
  const visible=search ? rows.filter(({row})=>matchesTerminationUnit(row,search)) : rows;
  const save=changeTerminationReview.bind(null,projectId);
  const label=TODAY_CHAPTERS.find(x=>x.id===chapter)?.label;
  const eligibleForReview=chapter==="termination" && mayReview && !reviews?.error;
  return <section aria-label={label}>
    <h2 className="text-lg font-semibold">{label} · {rows.length}세대</h2>
    {chapter==="balance" ? <p className="mb-2 text-sm text-neutral-700">상담에서 잔금일을 확인했지만 아직 완납이 확인되지 않은 세대입니다.</p> : null}
    {chapter==="paid" ? <p className="mb-2 text-sm text-neutral-700">Decision OS에서 완납이 확인된 세대입니다. 완납일이 없는 경우 날짜를 추정하지 않습니다.</p> : null}
    {chapter==="move" ? <p className="mb-2 text-sm text-neutral-700">이사 예약 {rows.filter(x=>x.e.reservation).length}세대 · 상담·계획 입주일 {rows.filter(x=>x.e.movePlan).length}세대 · 실제 입주 {rows.filter(x=>x.e.moved).length}세대 (중복 포함)</p> : null}
    {schedules?.error ? <p role="status" className="text-sm text-red-800">상담상 날짜를 불러오지 못했습니다. 날짜 확인 전에는 미확정으로 판정하지 않습니다.</p> : null}
    {reviews?.error ? <p role="status" className="text-sm text-red-800">관리자 해지 검토 목록을 불러오지 못했습니다. 기존 해지 의향만 표시합니다.</p> : null}
    {reviewNotice==="saved" ? <p role="status">해지 검토 상태를 저장했습니다. 계약 상태는 바뀌지 않았습니다.</p> : null}
    {reviewNotice==="error" ? <p role="alert">저장하지 못했습니다. 동·호수, 사유, 현재 계약 상태를 확인해 주세요.</p> : null}
    {chapter==="termination" ? <form method="get" action={`/projects/${projectId}/move-in/today`} role="search" className="my-4 flex flex-wrap items-end gap-2">
      <input type="hidden" name="todayChapter" value="termination"/>
      <label className="grid gap-1 text-sm font-medium">동·호수 찾기
        <input type="search" name="unitSearch" defaultValue={search} maxLength={40} placeholder="예: 101-1902" className="min-h-10 rounded border px-2"/>
      </label>
      <button type="submit" className="min-h-10 rounded border px-3">검색</button>
      {search ? <Link prefetch={false} className="mb-2 text-sm underline" href={todayChapterHref(projectId,"termination")}>초기화</Link> : null}
      {search ? <p role="status" className="w-full text-sm">검색 결과 {visible.length}세대</p> : null}
    </form> : null}
    {eligibleForReview ? <form action={save} className="my-4 flex flex-wrap items-end gap-2 rounded border p-3">
      <input type="hidden" name="mode" value="add"/><input type="hidden" name="unitSearch" value={search}/>
      <label className="grid gap-1 text-sm">동<input className="w-24 rounded border px-2 py-1" name="building" inputMode="numeric" maxLength={6} required/></label>
      <label className="grid gap-1 text-sm">호수<input className="w-24 rounded border px-2 py-1" name="unit" inputMode="numeric" maxLength={6} required/></label>
      <label className="grid gap-1 text-sm">검토 사유<input className="w-full rounded border px-2 py-1" name="reason" maxLength={500} required/></label>
      <button className="rounded border px-3 py-1" type="submit">해지 검토 추가</button>
      <p className="w-full text-xs text-neutral-600">검토 대상으로만 추가됩니다. 실제 계약 해지가 아닙니다.</p>
    </form> : null}
    {chapter==="unconfirmed" && schedules?.error ? null : !visible.length ? <p className="mt-3 text-sm">{search ? "검색 조건에 맞는 해지 검토·의향 세대가 없습니다." : "해당 세대가 없습니다."}</p> :
      <div className="mt-3 overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
        <thead><tr className="border-b">{["동·호수","등급","마지막 상담일","다음 확인일","확인 내용",...(eligibleForReview?["관리"]:[])].map(h=><th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{visible.map(({row,reservation,dates,review,e})=>{
          const floorplan=`/projects/${projectId}/move-in/floorplan?${new URLSearchParams({buildingNo:row.buildingNo})}`;
          const detail=buildMoveInUnitDetailHref(projectId,row.unitId,floorplan)+"#consultation-create-form";
          const map=`/projects/${projectId}/move-in/floorplan?${new URLSearchParams({focusUnit:row.unitId})}#floorplan-unit-${encodeURIComponent(row.unitId)}`;
          const notes=[
            e.paid ? `완납 ${row.balancePaidAt?formatDateTime(row.balancePaidAt):"(일자 미확인)"}`:null,
            dates?.balance ? `상담상 잔금 예정 ${dates.balance}`:null,
            e.reservation ? `노크타운 이사 예약 ${[reservation.movingDate,reservation.movingTime].filter(Boolean).join(" ")}`:null,
            row.plannedMoveInDate ? `등록 이사 예정일 ${row.plannedMoveInDate}`:null,
            dates?.moveIn ? `상담상 입주 예정 ${dates.moveIn}`:null,
            e.moved ? `실제 입주 ${row.actualMoveInDate}`:null,
            e.sale ? "전매 의향":null,
            e.terminationIntent ? "해지 의향" : null,
            review?.active ? `관리자 해지 검토: ${review.reason}`:null,
          ].filter(Boolean);
          return <tr key={row.unitId} className="border-b">
            <td className="p-2 whitespace-nowrap"><Link prefetch={false} className="font-semibold underline" href={detail}>{formatUnitLabel(row.buildingNo,row.unitNo)}</Link>{" "}<Link prefetch={false} className="text-xs underline" href={map}>배치도</Link></td>
            <td className="p-2">{row.currentGrade??"—"}</td>
            <td className="p-2 whitespace-nowrap">{formatDateTime(row.lastContact)}</td>
            <td className="p-2 whitespace-nowrap">{formatDateTime(row.nextContact)}</td>
            <td className="p-2">{notes.length ? notes.map(n=><span className="block" key={n}>{n}</span>):"잔금·이사 일정 확인 필요"}</td>
            {eligibleForReview ? <td className="p-2">{review?.active ? <form action={save} className="flex gap-1">
              <input type="hidden" name="mode" value="remove"/><input type="hidden" name="unitSearch" value={search}/><input type="hidden" name="unitId" value={row.unitId}/><input type="hidden" name="contractId" value={row.currentContractId}/><input type="hidden" name="eventId" value={review.event_id}/>
              <input name="reason" aria-label={`${formatUnitLabel(row.buildingNo,row.unitNo)} 해제 사유`} placeholder="해제 사유" className="w-28 rounded border px-1" required maxLength={500}/>
              <button type="submit" className="whitespace-nowrap rounded border px-2">검토 해제</button></form> : "—"}</td>:null}
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
