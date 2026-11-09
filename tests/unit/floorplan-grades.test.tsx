// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { FloorplanClient } from '@/components/move-in/floorplan-client';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);
const base: FloorplanUnit = {projectId:'p',unitId:'u',buildingNo:'101',unitNo:'201',floor:2,currentGrade:null,funding:'NORMAL',moveIn:'CONTACTED',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:[],balancePaidAt:null,actualMoveInDate:null,revision:'r',fetchedAt:'2026-11-09'};

test.each(['A','B','C','D'])('%s grade remains visible with payment, reservation and management tags', grade => {
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:'p',units:[{...base,currentGrade:grade,balancePaidAt:'2026-11-09',moveReservation:'BOOKED',movingDate:'2026-11-15',sourceTags:['ASEL','DELINQUENT'],specialReasons:['MANUAL']}]}));
  expect(html).toContain(`data-grade="${grade}"`);
  expect(html).toContain(`${grade}등급`);
  expect(html).toContain('data-balance-paid="true"');
  expect(html).toContain('bg-green-100');
  expect(html).toContain('data-move-reserved="true"');
  for(const label of ['이사예약','아셀','연체','특별관리']) expect(html).toContain(label);
  expect(html).toContain('/projects/p/move-in/units/u');
});
test('missing grades never receive an invented badge',()=>{
  const html=renderToStaticMarkup(createElement(FloorplanBoard,{projectId:'p',units:[base]}));
  expect(html).not.toContain('data-grade=');
});
test('four buildings per page preserve all links and global counts',()=>{
  const units=Array.from({length:9},(_,i)=>({...base,unitId:`u${i}`,buildingNo:String(101+i),currentGrade:'A',balancePaidAt:i===0?'2026-11-09':null}));
  const view=render(createElement(FloorplanClient,{projectId:'p',units,initialBuildingNo:'101'}));
  const links=()=>Array.from(view.container.querySelectorAll('a[href*="/units/"]')).map(a=>a.getAttribute('href'));
  const all=[...links()];
  expect(all).toHaveLength(4);
  expect(view.getByText(/전체 9세대/)).toBeTruthy();
  fireEvent.click(view.getByRole('button',{name:'다음 4개 동'})); all.push(...links()); expect(links()).toHaveLength(4);
  fireEvent.click(view.getByRole('button',{name:'다음 4개 동'})); all.push(...links()); expect(links()).toHaveLength(1);
  expect(new Set(all).size).toBe(9);
  expect(view.getByText(/전체 9세대/)).toBeTruthy();
  fireEvent.click(view.getByRole('button',{name:'이전 4개 동'})); expect(links()).toHaveLength(4);
});

test('all 851 synthetic households remain reachable through the actual client pages',()=>{
  const db=Array.from({length:851},(_,i)=>({unit_id:`unit-${i}`,building_no:String(101+i%8),unit_no:String(101+Math.floor(i/8)*100),floor:null,legacy_grade:['A','B','C','D'][i%4]}));
  const units:FloorplanUnit[]=db.map(r=>({...base,unitId:r.unit_id,buildingNo:r.building_no,unitNo:r.unit_no,floor:r.floor,currentGrade:r.legacy_grade}));
  const view=render(createElement(FloorplanClient,{projectId:'p',units,initialBuildingNo:'101'}));
  const ids:string[]=[];
  for(let page=0;page<2;page++){
    expect(view.container.querySelectorAll('thead th[colspan]')).toHaveLength(4);
    ids.push(...Array.from(view.container.querySelectorAll('a[href*="/units/"]')).map(a=>a.getAttribute('href')!));
    if(page===0) fireEvent.click(view.getByRole('button',{name:'다음 4개 동'}));
  }
  expect(new Set(ids).size).toBe(851);
  expect(ids.sort()).toEqual(db.map(r=>`/projects/p/move-in/units/${r.unit_id}`).sort());
});
