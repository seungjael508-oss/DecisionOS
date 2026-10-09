import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';
import { LEDGER_COLUMNS, ledgerCells } from '@/lib/move-in/ledger-presentation';

const sticky = ['min-[1100px]:sticky min-[1100px]:left-0 min-[1100px]:w-32 min-[1100px]:min-w-32',
  'min-[1100px]:sticky min-[1100px]:left-32 min-[1100px]:w-28 min-[1100px]:min-w-28',
  'min-[1100px]:sticky min-[1100px]:left-60 min-[1100px]:w-44 min-[1100px]:min-w-44',
  'min-[1100px]:sticky min-[1100px]:left-[416px] min-[1100px]:w-48 min-[1100px]:min-w-48'];
export function LedgerTable({rows,assignees}: {rows:readonly LedgerSummaryRow[];assignees:Record<string,string>}) {
  return <div className="min-[1100px]:overflow-x-auto">
    <table role="table" aria-label="통합원장 목록" className="block w-full border-separate border-spacing-0 text-sm min-[1100px]:table">
      <thead className="sr-only min-[1100px]:not-sr-only min-[1100px]:table-header-group"><tr role="row">
        {LEDGER_COLUMNS.map((label,i)=><th role="columnheader" scope="col" key={label} className={`border-b border-neutral-400 bg-neutral-100 p-3 text-left whitespace-nowrap ${sticky[i]??''} ${i<4?'z-20':''}`}>{label}</th>)}
      </tr></thead>
      <tbody className="block min-[1100px]:table-row-group">{rows.map(row=><tr role="row" key={row.unitId} data-unit-id={row.unitId} className="mb-4 grid grid-cols-2 rounded border border-neutral-300 min-[1100px]:table-row">
        {ledgerCells(row,assignees).map((value,i)=><td role="cell" key={LEDGER_COLUMNS[i]} data-label={LEDGER_COLUMNS[i]} data-core={i<4?'true':undefined}
          className={`min-w-0 border-b border-neutral-200 p-3 align-top break-words min-[1100px]:whitespace-nowrap ${sticky[i]??''} ${i<4?'z-10 bg-neutral-50 font-medium':'bg-white'}`}>
          <span aria-hidden="true" className="mb-1 block text-xs font-normal text-neutral-600 min-[1100px]:hidden">{LEDGER_COLUMNS[i]}</span>{value}
        </td>)}
      </tr>)}</tbody>
    </table>
    {!rows.length?<p className="p-6">조건에 맞는 세대가 없습니다.</p>:null}
  </div>;
}
