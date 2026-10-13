import 'server-only';
import ExcelJS from 'exceljs';
import { LEDGER_COLUMNS } from '@/lib/move-in/ledger-presentation';

/** XLSX string cells are never formulas; prefix risky text for safe later CSV conversion too. */
export function safeSpreadsheetText(value: string): string {
  return /^[\s\u0000-\u001f\u007f]*[=+@\-＝＋＠－]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
export async function buildLedgerWorkbook(rows: readonly string[][]): Promise<string> {
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('통합원장');
  sheet.addRow([...LEDGER_COLUMNS]);
  for(const row of rows) sheet.addRow(row.map(safeSpreadsheetText));
  sheet.columns.forEach((column,index)=>{column.numFmt='@';column.width=index===3?24:20;});
  sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',xSplit:4,ySplit:1}];
  sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:LEDGER_COLUMNS.length}};
  return Buffer.from(await workbook.xlsx.writeBuffer()).toString('base64');
}
