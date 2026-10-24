import type { LedgerClientRow } from '@/lib/move-in/ledger-types';
import { LEDGER_COLUMNS, LEDGER_SCREEN_HIDDEN_COLUMNS, balancePaidRemainder, isBalancePaid, isMoveReserved, ledgerCells } from '@/lib/move-in/ledger-presentation';
import { isProblemHousehold } from '@/lib/move-in/problem-household';
import { BalancePaidBadge, MoveReservationBadge, ProblemHouseholdBadges, ProblemReasonText } from './ledger-badges';

// 문제세대 사유를 적색으로 함께 적는 칸(납부상태·입주진행·이사예정일)
const PROBLEM_TEXT_COLUMNS: ReadonlySet<string> = new Set(['납부상태','입주진행','이사예정일']);

const sticky = ['min-[1100px]:sticky min-[1100px]:left-0 min-[1100px]:w-32 min-[1100px]:min-w-32',
  'min-[1100px]:sticky min-[1100px]:left-32 min-[1100px]:w-28 min-[1100px]:min-w-28',
  'min-[1100px]:sticky min-[1100px]:left-60 min-[1100px]:w-44 min-[1100px]:min-w-44',
  'min-[1100px]:sticky min-[1100px]:left-[416px] min-[1100px]:w-48 min-[1100px]:min-w-48'];
export function LedgerTable({rows,assignees}: {rows:readonly LedgerClientRow[];assignees:Record<string,string>}) {
  return <div className="min-[1100px]:overflow-x-auto">
    <table role="table" aria-label="통합원장 목록" className="block w-full border-separate border-spacing-0 text-sm min-[1100px]:table">
      <thead className="sr-only min-[1100px]:not-sr-only min-[1100px]:table-header-group"><tr role="row">
        {LEDGER_COLUMNS.map((label,i)=>LEDGER_SCREEN_HIDDEN_COLUMNS.has(label)?null:<th role="columnheader" scope="col" key={label} className={`border-b border-neutral-400 bg-neutral-100 p-3 text-left whitespace-nowrap ${sticky[i]??''} ${i<4?'z-20':''}`}>{label}</th>)}
      </tr></thead>
      <tbody className="block min-[1100px]:table-row-group">{rows.map(row=>{const paid=isBalancePaid(row),reserved=isMoveReserved(row),problem=isProblemHousehold(row);return <tr role="row" key={row.unitId} data-unit-id={row.unitId} data-balance-paid={paid?'true':undefined} data-move-reserved={reserved?'true':undefined} data-problem-household={problem?'true':undefined} className={`mb-4 grid grid-cols-2 rounded border min-[1100px]:table-row ${problem?'border-red-300':paid?'border-green-300':'border-neutral-300'}`}>
        {ledgerCells(row,assignees).map((value,i)=>LEDGER_SCREEN_HIDDEN_COLUMNS.has(LEDGER_COLUMNS[i])?null:<td role="cell" key={LEDGER_COLUMNS[i]} data-label={LEDGER_COLUMNS[i]} data-core={i<4?'true':undefined}
          className={`min-w-0 border-b p-3 align-top break-words min-[1100px]:whitespace-nowrap ${sticky[i]??''} ${i<4?'z-10 font-medium':''} ${problem?'border-red-200 bg-red-50':paid?'border-green-200 bg-green-50':`border-neutral-200 ${i<4?'bg-neutral-50':'bg-white'}`} ${i===0?problem?'border-l-[3px] border-l-red-600':paid?'border-l-[3px] border-l-green-500':'':''}`}>
          <span aria-hidden="true" className="mb-1 block text-xs font-normal text-neutral-600 min-[1100px]:hidden">{LEDGER_COLUMNS[i]}</span>
          {i===0&&(paid||reserved||problem)?<span className="flex flex-wrap items-center gap-1">
            <ProblemHouseholdBadges flags={row.problemFlags} released={row.problemLockReleased}/>
            {paid?<BalancePaidBadge remainder={balancePaidRemainder(row)}/>:null}
            {reserved?<MoveReservationBadge date={row.management?.movingDate??null}/>:null}
            <span>{value}</span>
          </span>:problem&&PROBLEM_TEXT_COLUMNS.has(LEDGER_COLUMNS[i])?<>{value}<ProblemReasonText flags={row.problemFlags} released={row.problemLockReleased}/></>:value}
        </td>)}
      </tr>;})}</tbody>
    </table>
    {!rows.length?<p className="p-6">조건에 맞는 세대가 없습니다.</p>:null}
  </div>;
}
