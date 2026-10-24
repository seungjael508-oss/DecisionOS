import type { LedgerClientRow } from '@/lib/move-in/ledger-types';
import { LEDGER_COLUMNS, balancePaidRemainder, isBalancePaid, isMoveReserved, ledgerCells, ledgerOptionLabel } from '@/lib/move-in/ledger-presentation';
import { isProblemHousehold, problemReasonText } from '@/lib/move-in/problem-household';
import { BalancePaidBadge, MoveReservationBadge, ProblemHouseholdBadges, ProblemReasonText } from './ledger-badges';

const at = (label: (typeof LEDGER_COLUMNS)[number]) => LEDGER_COLUMNS.indexOf(label);

/**
 * 모바일(1100px 미만) 통합원장 카드 목록. 표와 같은 셀 함수로 핵심 항목만 보인다.
 * 카드 터치는 LedgerDetailShell이 [data-unit-id]로 받아 세대 상세를 연다(표 행과 같은 경로).
 */
export function LedgerCardList({rows,assignees}: {rows:readonly LedgerClientRow[];assignees:Record<string,string>}) {
  if(!rows.length)return <p className="p-6">조건에 맞는 세대가 없습니다.</p>;
  return <ul aria-label="통합원장 카드 목록" className="flex flex-col gap-3">{rows.map(row=>{
    const cells=ledgerCells(row,assignees),special=cells[at('특별관리')],reservation=cells[at('입주예약')],paid=isBalancePaid(row),reserved=isMoveReserved(row),problem=isProblemHousehold(row);
    return <li key={row.unitId} id={`ledger-card-${row.unitId}`} data-unit-id={row.unitId} data-balance-paid={paid?'true':undefined} data-move-reserved={reserved?'true':undefined} data-problem-household={problem?'true':undefined}>
      <button type="button" data-ledger-select={row.unitId} aria-label={`${cells[at('동/호수')]}${problem?` 문제세대 ${problemReasonText(row.problemFlags)}`:''}${paid?' 잔금완납':''} 상세 열기`}
        className={`block w-full rounded border p-4 text-left ${problem?'border-red-300 border-l-[3px] border-l-red-600 bg-red-50 active:bg-red-100':paid?'border-green-300 border-l-[3px] border-l-green-500 bg-green-50 active:bg-green-100':'border-neutral-300 bg-white active:bg-neutral-100'}`}>
        <span className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <ProblemHouseholdBadges flags={row.problemFlags} released={row.problemLockReleased}/>
            {paid?<BalancePaidBadge remainder={balancePaidRemainder(row)}/>:null}
            {reserved?<MoveReservationBadge date={row.management?.movingDate??null}/>:null}
            <span className="text-lg font-semibold">{cells[at('동/호수')]}</span>
          </span>
          <span className="shrink-0 rounded border border-neutral-500 px-2 text-sm">{cells[at('현재등급')]}</span>
        </span>
        <span className="mt-1 block">{cells[at('계약자')]} · {cells[at('전화번호')]}</span>
        {row.currentGrade==='D'?<span className="mt-1 block text-sm font-medium text-red-800">D 사유 {row.dGradeReasons.length?row.dGradeReasons.map(r=>ledgerOptionLabel('dGradeReason',r,assignees)).join(' · '):'미확인'}</span>:null}
        <span className="mt-1 block text-sm text-neutral-700">입주예약 {reservation} · 납부 {cells[at('납부상태')]} · 미납 {cells[at('전체 미납액')]}</span>
        <ProblemReasonText flags={row.problemFlags} released={row.problemLockReleased}/>
        <span className="mt-1 block text-sm text-neutral-700">{cells[at('접촉상태')]} · 최종접촉 {cells[at('최종접촉')]} · 담당 {cells[at('담당자')]}</span>
        {special!=='—'?<span className="mt-1 block text-sm text-neutral-700">특별관리 {special}</span>:null}
      </button>
    </li>;})}</ul>;
}
