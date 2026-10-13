import {LedgerSummaryProvider} from '@/components/move-in/ledger-summary-store';
import type {ReactNode} from 'react';
import {LedgerDetailShell} from '@/components/move-in/ledger-detail-shell';
import '@/components/move-in/ledger-detail-shell.css';
export default async function LedgerLayout({children,params}:{children:ReactNode;params:Promise<{projectId:string}>}){
 const {projectId}=await params;return <LedgerSummaryProvider><LedgerDetailShell projectId={projectId}>{children}</LedgerDetailShell></LedgerSummaryProvider>;
}
