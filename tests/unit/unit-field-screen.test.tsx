// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {UnitTable} from '@/components/move-in/unit-table';
import {sortUnits,type UnitListRow} from '@/lib/move-in/filters';
afterEach(cleanup);
const row=(unitNo:string,buildingNo='101'):UnitListRow=>({unitId:buildingNo+unitNo,unitNo,buildingNo,customerName:'Synthetic holder',customerPhone:'invalid',phoneQuality:'PHONE_INVALID',latestGrade:'부재',latestConsultation:'Synthetic most recent content',occupancyIntent:null,fundingStatus:null,moveInStatus:null,balancePaidAt:null,actualMoveInDate:null,plannedMoveInDate:null,lastContactAt:'2026-09-17T01:00:00Z',nextContactAt:null});
it('sorts buildings and units numerically without mutating the source',()=>{
 const rows=[row('1001'),row('201'),row('202'),row('201','99')];
 expect(sortUnits(rows).map(r=>r.unitId)).toEqual(['99201','101201','101202','1011001']);
 expect(rows[0].unitNo).toBe('1001');
});
it('renders field columns, legacy grade, clamped content and invalid-phone actions',()=>{
 render(<UnitTable projectId="synthetic" rows={[row('201')]}/>);
 for(const name of ['동호수','계약자','전화번호','현재등급','최근상담','최근접촉','다음접촉'])expect(screen.getByRole('columnheader',{name})).toBeTruthy();
 expect(screen.getByRole('cell',{name:'부재'})).toBeTruthy();
 expect(screen.getAllByText('Synthetic most recent content')[0].className).toContain('line-clamp-2');
 expect(screen.getAllByText(/전화번호 확인필요/).length).toBeGreaterThan(0);
 expect(screen.queryByRole('link',{name:'전화'})).toBeNull();
});
