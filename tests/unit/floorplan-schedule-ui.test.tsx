// @vitest-environment jsdom
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect,test } from 'vitest';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';
const base:FloorplanUnit={projectId:'p',unitId:'u',buildingNo:'101',unitNo:'201',floor:2,currentGrade:'A',funding:'NORMAL',moveIn:'CONTACTED',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:['MANUAL'],sourceTags:['ASEL','DELINQUENT'],balancePaidAt:null,actualMoveInDate:null,revision:'r',fetchedAt:'2026-11-16',moveReservation:'BOOKED',movingDate:'2026-12-25'};
const html=(patch:Partial<FloorplanUnit>)=>renderToStaticMarkup(createElement(FloorplanBoard,{projectId:'p',units:[{...base,...patch}]}));
test('A tile renders exactly one schedule badge without changing existing tags or link',()=>{
 const output=html({scheduleBadge:{kind:'balance',label:'잔금 12/20'}});
 expect(output).toContain('data-schedule-kind="balance"');expect(output).toContain('잔금 12/20');
 expect((output.match(/data-schedule-kind=/g)??[])).toHaveLength(1);
 for(const value of ['data-grade="A"','아셀','연체','특별관리','data-move-reserved="true"','/projects/p/move-in/units/u'])expect(output).toContain(value);
});
test.each(['B','C','D'])('%s never renders an injected A-only schedule',currentGrade=>expect(html({currentGrade,scheduleBadge:{kind:'balance',label:'잔금 12/20'}})).not.toContain('data-schedule-kind'));
test('paid green remains and a balance schedule is suppressed',()=>{
 const output=html({balancePaidAt:'2026-11-16',scheduleBadge:{kind:'balance',label:'잔금 12/20'}});
 expect(output).toContain('bg-green-100');expect(output).toContain('data-balance-paid="true"');expect(output).not.toContain('data-schedule-kind');
});
test('no derived schedule produces no new badge',()=>expect(html({})).not.toContain('data-schedule-kind'));
