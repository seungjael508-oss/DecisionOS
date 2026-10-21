import type { BalanceAccountView, CurrentUnitSnapshot, LedgerSummaryRow } from '@/lib/move-in/ledger-types';
import type { ConsultationHistoryRow,UnitDetail,RelatedHolderUnit } from '@/lib/move-in/queries';
import type { UnitDealRecord } from '@/lib/move-in/deals';
import type { SpecialCaseMetadata } from '@/lib/move-in/special-case';
import type { BrokerageOfficeOption } from '@/lib/move-in/brokerages';
import type { MoveInRole } from '@/lib/move-in/access';
import type { RegisteredPaymentProjection } from '@/lib/move-in/payment-projection.server';
import type { DGradeReason } from '@/lib/move-in/d-grade-reasons';
export type WorkspaceIdentity={contractId:string;customerId:string};
export type WorkspaceHistory={rows:ConsultationHistoryRow[];nextOffset:number|null};
export type UnitWorkspace={
 projectId:string;detail:UnitDetail;snapshot:CurrentUnitSnapshot;identity:WorkspaceIdentity;
 capabilities:{role:MoveInRole;memberId:string;fieldWrite:boolean;specialWrite:boolean;saveEnabled:boolean};
 summary?:LedgerSummaryRow;history:WorkspaceHistory;deal:UnitDealRecord|null;special:SpecialCaseMetadata|null;paymentAvailability:'unregistered'|'registered';payment?:RegisteredPaymentProjection|null;
 /** 잔금 가상계좌(서버 권한 판정 결과만) */ balanceAccount?:BalanceAccountView;
 /** D등급 관리 사유(서버 판정). D가 아니면 비어 있음. unavailable = 근거 조회 실패로 판정하지 못한 사유 */
 dGradeReasons?:DGradeReason[];dGradeReasonUnavailable?:DGradeReason[];
};
export type UnitWorkspaceResult={kind:'ok';workspace:UnitWorkspace}|{kind:'unavailable'|'stale'};
export type UnitWorkspaceSectionResult={kind:'history';history:WorkspaceHistory}|{kind:'brokers';offices:BrokerageOfficeOption[];deal:UnitDealRecord|null}|{kind:'related';units:RelatedHolderUnit[]}|{kind:'identity';identity:WorkspaceIdentity}|{kind:'unavailable'|'stale'|'retryable'};
