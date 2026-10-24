import type {CreateMoveInConsultationInput} from './consultation';
import type {SaveMoveInUnitDealInput} from './deals';
import type {SaveMoveInSpecialCaseInput} from '@/app/projects/[projectId]/move-in/deals/actions';
import type {UnitWorkspace,WorkspaceIdentity} from './unit-workspace-types';
import type {LedgerSummaryRow} from './ledger-types';
import type {TradeFundingStatus,TradeFundingType} from './trade-funding';
import type {ProblemFlag} from './problem-household';
export type SaveMoveInTradeFundingInput={projectId:string;unitId:string;customerId:string;contractId:string;tradeFundingType:TradeFundingType|'';tradeFundingStatus:TradeFundingStatus|''};
/** 관리자 잔금완납 지정·수정·해제. paidOn ''이면 해제(직전 입주진행으로 되돌림) */
export type SaveMoveInBalancePaidInput={projectId:string;unitId:string;customerId:string;contractId:string;paidOn:string;reason:string};
/** 관리자 문제세대 지정·해제·잠금 해제 승인. flags 빈 배열이면 문제세대 해제 */
export type SaveMoveInProblemHouseholdInput={projectId:string;unitId:string;customerId:string;contractId:string;flags:ProblemFlag[];lockReleased:boolean;note:string;reason:string};
export type WorkspaceSaveIdentity={projectId:string;unitId:string;identity:WorkspaceIdentity;returnTo:string};
export type WorkspaceChange={kind:'consultation';input:CreateMoveInConsultationInput}|{kind:'deal';input:SaveMoveInUnitDealInput}|{kind:'special';input:SaveMoveInSpecialCaseInput}|{kind:'tradeFunding';input:SaveMoveInTradeFundingInput}|{kind:'balancePaid';input:SaveMoveInBalancePaidInput}|{kind:'problemHousehold';input:SaveMoveInProblemHouseholdInput};
export type WorkspaceSaveRequest=WorkspaceSaveIdentity&{change:WorkspaceChange;afterSave:'stay'|'next'};
export type WorkspaceSaveResult={ok:true;workspace:UnitWorkspace;row:LedgerSummaryRow;destination?:string}|{ok:false;code:'invalid_input'|'forbidden'|'stale_contract'|'context_failed'|'save_failed'|'refresh_failed';committed:boolean|'unknown';destination?:string};
