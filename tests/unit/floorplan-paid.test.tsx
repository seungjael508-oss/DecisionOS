import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { floorplanCurrentPresentation, type FloorplanUnit } from '@/lib/move-in/floorplan';
const unit: FloorplanUnit = {projectId:'p',unitId:'u',buildingNo:'101',unitNo:'201',floor:2,currentGrade:'D',funding:'NORMAL',moveIn:'MOVED_IN',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:['DELINQUENT'],balancePaidAt:null,actualMoveInDate:'2026-11-06T00:00:00Z',revision:'r',fetchedAt:'2026-11-06T00:00:00Z'};
test('only a registered paid date makes the tile green, retaining grade and special tags',()=>{
  expect(floorplanCurrentPresentation(unit).className).toContain('bg-red-200');
  const paid={...unit,balancePaidAt:'2026-11-06T00:00:00Z',problemFlags:['SEIZURE'] as const};
  const p=floorplanCurrentPresentation(paid);
  expect(p.className).toContain('bg-green-100');
  expect(p.className).not.toContain('bg-red-200');
  expect(p.gradeLabel).toBe('D');
  expect(p.tags.map(t=>t.key)).toEqual(expect.arrayContaining(['problem','special','reason:DELINQUENT','paid','moved']));
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:'p',units:[paid],buildingNo:'101'}));
  expect(html).toContain('/projects/p/move-in/units/u');
  expect(html).toContain('data-balance-paid="true"');
});
test('clearing the date restores the previous grade color independently of move-in',()=>{
  expect(floorplanCurrentPresentation({...unit,moveIn:'BALANCE_PAID'}).className).toContain('bg-red-200');
});
