import { MasterLedgerClient } from '@/components/move-in/master-ledger-client';
import { LEDGER_FINANCE_AS_OF } from '@/lib/move-in/ledger-finance.server';
import { LedgerManagementSourceNotice } from '@/components/move-in/ledger-management-source-notice';
import { loadLedgerWorkspace, toLedgerClientResult } from '@/lib/move-in/ledger-workspace.server';
import '@/components/move-in/ledger-workspace.css';

export default async function LedgerPage({params,searchParams}: {params:Promise<{projectId:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {projectId}=await params;const workspace=await loadLedgerWorkspace(projectId);
  if(!workspace.ok)return <main className="p-6"><p role="alert">{workspace.error}</p></main>;
  const query=new URLSearchParams();for(const [key,value] of Object.entries(await searchParams)) for(const item of Array.isArray(value)?value:value===undefined?[]:[value]) query.append(key,item);
  return <main data-ledger-workspace="true" className="p-4 min-[1100px]:p-6"><LedgerManagementSourceNotice projectId={projectId}/><p className="mb-2 text-xs text-neutral-600">금액 자료 기준: 분양대금 {LEDGER_FINANCE_AS_OF.sale} · 발코니 {LEDGER_FINANCE_AS_OF.balcony ?? '미확인'} · 옵션 {LEDGER_FINANCE_AS_OF.option ?? '미확인'} · 가상계좌 {LEDGER_FINANCE_AS_OF.account ?? '미확인'} (아파트 분양 잔금 전용)</p><MasterLedgerClient projectId={projectId} result={toLedgerClientResult(workspace.result)}assignees={workspace.assignees} initialQuery={query.toString()} /></main>;
}
