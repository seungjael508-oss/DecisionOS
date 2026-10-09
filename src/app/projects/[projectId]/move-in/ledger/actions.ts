'use server';
import { loadLedgerWorkspace } from '@/lib/move-in/ledger-workspace.server';
import { applyLedgerQuery, parseLedgerQuery } from '@/lib/move-in/ledger-filters';
import { ledgerCells } from '@/lib/move-in/ledger-presentation';
import { buildLedgerWorkbook } from '@/lib/move-in/ledger-export';

/** Accept filter text only, never client-supplied rows/phone/authorization. Recheck access per action. */
export async function prepareLedgerPrint(projectId:string,query:string):Promise<{ok:true;rows:string[][];asOf:string}|{ok:false;error:string}> {
  if(typeof query!=='string' || query.length>32768)return {ok:false,error:'필터를 확인해 주세요.'};
  const state=parseLedgerQuery(new URLSearchParams(query));
  if(state.issues.length)return {ok:false,error:'지원하지 않는 필터입니다. 초기화 후 다시 시도해 주세요.'};
  const workspace=await loadLedgerWorkspace(projectId);
  if(!workspace.ok)return workspace;
  const {result,assignees}=workspace;
  const selected=applyLedgerQuery(result.rows,state,new Date(result.snapshotAsOf));
  return {ok:true,rows:selected.filteredSorted.map(row=>ledgerCells(row,assignees)),asOf:result.snapshotAsOf};
}
export async function exportLedgerXlsx(projectId:string,query:string):Promise<{ok:true;base64:string;filename:string}|{ok:false;error:string}> {
  const result=await prepareLedgerPrint(projectId,query);
  if(!result.ok)return result;
  try {return {ok:true,base64:await buildLedgerWorkbook(result.rows),filename:'통합원장.xlsx'};}
  catch {return {ok:false,error:'내보내기 파일을 만들지 못했습니다. 다시 시도해 주세요.'};}
}
