import { beforeEach, expect, test, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { UnitDetail } from '@/lib/move-in/queries';
import type { UnitWorkspace } from '@/lib/move-in/unit-workspace-types';
const state = vi.hoisted(() => ({allowed:true,detail:null as UnitDetail|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:vi.fn(async()=>state.allowed?{ok:true,projectId:'1283e198-5043-4027-96d6-edcc7a6686c6',role:'PROJECT_ADMIN',memberId:'admin'}:{ok:false,kind:'forbidden'})}));
vi.mock('@/lib/move-in/queries',()=>({
  loadUnitDetail:vi.fn(async()=>({kind:'ok',detail:state.detail,consultations:[]})),
  loadUnitDeal:async()=>({error:false,deal:null}),loadBrokerageOffices:async()=>({error:false,offices:[]}),
  loadUnitRows:async()=>({error:false,rows:[]}),loadMoveInTodayQueueRows:async()=>({error:false,rows:[]}),
  loadMoveInSpecialCaseProjection:async()=>({error:false,projection:null}),
}));
vi.mock('@/lib/move-in/d-grade-reasons.server',()=>({loadDGradeReasons:async()=>({byUnit:new Map(),unavailable:[]})}));
vi.mock('@/lib/move-in/payment-projection.server',()=>({loadPaymentContractChain:async()=>[],paymentForCurrentContract:()=>null}));
vi.mock('@/lib/move-in/ledger-finance.server',()=>({balanceAccountFor:()=>({kind:'unknown'})}));
vi.mock('@/lib/move-in/unit-workspace.server',()=>({verifyUnitWorkspaceIdentity:async()=>({ok:true})}));
vi.mock('@/components/move-in/unit-detail-workspace',()=>({UnitDetailWorkspace:({children}:{children:ReactNode})=>children,useUnitDetailWorkspace:()=>null}));
vi.mock('@/components/move-in/unit-save-context',()=>({UnitSaveProvider:({children}:{children:ReactNode})=>children,useUnitSave:()=>null}));
vi.mock('@/components/move-in/mobile-detail-tabs',()=>({MobileDetailTabs:({children,header}:{children:ReactNode;header:ReactNode})=>createElement('div',null,header,children),MobileUnitHeader:()=>null}));
// Stub editing controls only; render the actual page/panel, source mapping, badges and status cards.
vi.mock('@/components/move-in/consultation-create-form',()=>({ConsultationCreateForm:()=>null}));
vi.mock('@/components/move-in/consultation-history',()=>({ConsultationHistory:()=>null}));
vi.mock('@/components/move-in/occupancy-editor',()=>({OccupancyEditor:()=>null}));
vi.mock('@/components/move-in/deal-editor',()=>({DealEditor:()=>null}));
vi.mock('@/components/move-in/trade-funding-editor',()=>({TradeFundingEditor:()=>null}));
vi.mock('@/components/move-in/special-case-editor',()=>({SpecialCaseEditor:()=>null}));
vi.mock('@/components/move-in/balance-paid-editor',()=>({BalancePaidEditor:()=>null}));
vi.mock('@/components/move-in/problem-household-editor',()=>({ProblemHouseholdEditor:()=>null}));
import Page from '@/app/projects/[projectId]/move-in/units/[unitId]/page';
import { UnitDetailPanel } from '@/components/move-in/unit-detail-panel';
import { loadUnitDetail } from '@/lib/move-in/queries';
import { approvedUnitSourceTags } from '@/lib/move-in/ledger-source-tags.server';
import { loadHwayangSpecialTagSourceIndex } from '@/lib/move-in/special-tag-source';

const projectId='1283e198-5043-4027-96d6-edcc7a6686c6';
function detail(buildingNo:string,unitNo:string):UnitDetail {
  return {unitId:`unit-${buildingNo}-${unitNo}`,buildingNo,unitNo,unitType:'84',customerId:'customer',contractId:'contract',customerName:'테스트',customerPhone:null,phoneQuality:null,assignedCounselorId:null,relatedUnits:[],occupancy:{legacy_grade:'D',funding_status:'NORMAL',move_in_status:'CONTACTED',occupancy_intent:'UNDECIDED',operational_intent:'UNDECIDED',balance_paid_at:null,actual_move_in_date:null,next_contact_at:null,last_contact_at:null} as UnitDetail['occupancy']};
}
async function renderDetail(buildingNo:string,unitNo:string) {
  state.detail=detail(buildingNo,unitNo);
  const before=JSON.stringify(state.detail);
  const element=await Page({params:Promise.resolve({projectId,unitId:state.detail.unitId}),searchParams:Promise.resolve({})});
  expect(JSON.stringify(state.detail)).toBe(before);
  return renderToStaticMarkup(element);
}
beforeEach(()=>{state.allowed=true;vi.clearAllMocks();});

test('standalone detail renders all 36 Asel badges without D-grade reason or problem ASEL flag',async()=>{
  const expected=[...loadHwayangSpecialTagSourceIndex(projectId)].filter(([,source])=>source.asel).map(([key])=>key);
  expect(expected).toHaveLength(36);
  for(const key of expected) {
    const [buildingNo,unitNo]=key.split('-');
    const html=await renderDetail(buildingNo,unitNo);
    expect(html,key).toContain('data-source-tag="ASEL"');
    expect(html,key).toContain('D등급');
  }
  expect(await renderDetail('104','202')).not.toContain('data-source-tag="DELINQUENT"');
  expect(await renderDetail('101','701')).not.toContain('data-source-tag="ASEL"');
  expect(await renderDetail('101','701')).toContain('data-source-tag="DELINQUENT"');
});

test('detail access denial cannot reveal source badges or read unit detail',async()=>{
  state.allowed=false;
  expect(await Page({params:Promise.resolve({projectId,unitId:'unit-104-202'}),searchParams:Promise.resolve({})})).toBeNull();
  expect(loadUnitDetail).not.toHaveBeenCalled();
});

test('existing ledger detail panel renders the same 36 source badges independently of grade',()=>{
  for(const [key,source] of loadHwayangSpecialTagSourceIndex(projectId)) {
    if(!source.asel)continue;
    const [buildingNo,unitNo]=key.split('-');
    const sourceTags=approvedUnitSourceTags(projectId,buildingNo,unitNo);
    const workspace={projectId,detail:detail(buildingNo,unitNo),identity:{contractId:'contract',customerId:'customer'},capabilities:{role:'COUNSELOR',memberId:'member',fieldWrite:false,saveEnabled:false},history:{rows:[],nextOffset:null},deal:null,special:null,snapshot:{currentGrade:'A',sourceTags,specialReasons:sourceTags,problemFlags:[],effectiveIntent:'UNDECIDED',moveIn:'CONTACTED',balancePaidAt:null,actualMoveInDate:null}} as unknown as UnitWorkspace;
    const html=renderToStaticMarkup(createElement(UnitDetailPanel,{workspace,returnTo:`/projects/${projectId}/move-in/ledger`,onInvalidated:()=>{},onRelatedSelect:()=>{}}));
    expect(html,key).toContain('>아셀</span>');
    expect(html,key).not.toContain('D등급');
  }
});
