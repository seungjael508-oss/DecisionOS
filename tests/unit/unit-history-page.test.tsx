// @vitest-environment jsdom
import { expect,it,vi } from 'vitest';
import { render,screen } from '@testing-library/react';
vi.mock('@/lib/move-in/access',()=>({requireMoveInAccess:async()=>({ok:true,role:'COUNSELOR',memberId:'member'})}));
vi.mock('@/components/move-in/consultation-create-form',()=>({ConsultationCreateForm:()=> <div>새 상담 입력</div>}));
vi.mock('@/lib/move-in/queries',()=>({
 loadUnitDetail:async()=>({kind:'ok',detail:{buildingNo:'101',unitNo:'201',customerId:'current',contractId:'contract',customerName:'Synthetic holder',occupancy:null,relatedUnits:[]},consultations:[{id:'a',consultedAt:'2026-09-17T00:00:00Z',contactType:'CALL',purpose:'기타',content:'Synthetic prior call',counselorId:'member',legacyGrade:'C'}]}),
 loadUnitDeal:async()=>({error:true}),loadBrokerageOffices:async()=>({error:true})
}));
import Page from '@/app/projects/[projectId]/move-in/units/[unitId]/page';
it('keeps prior history visible before the new form even if unrelated deal data fails',async()=>{
 render(await Page({params:Promise.resolve({projectId:'p',unitId:'u'})}));
 const prior=screen.getAllByText('Synthetic prior call')[0];
 const form=screen.getByText('새 상담 입력');
 expect(prior.compareDocumentPosition(form)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
