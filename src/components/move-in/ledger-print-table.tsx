import { LEDGER_COLUMNS } from '@/lib/move-in/ledger-presentation';
export function LedgerPrintTable({rows,asOf}: {rows:readonly string[][];asOf:string}) {
  return <section className="hidden print:block" data-ledger-print="true">
    <h1>통합원장 · {rows.length}세대</h1><p>조회 기준: {asOf}</p>
    <table aria-label="통합원장 인쇄" className="w-full border-collapse text-xs"><thead><tr>
      {LEDGER_COLUMNS.map(label=><th key={label} className="border p-1">{label}</th>)}
    </tr></thead><tbody>{rows.map((cells,i)=><tr key={i}>{cells.map((cell,j)=><td key={LEDGER_COLUMNS[j]} className="border p-1">{cell}</td>)}</tr>)}</tbody></table>
  </section>;
}
