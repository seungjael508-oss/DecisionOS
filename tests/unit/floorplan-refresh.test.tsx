// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {createElement} from 'react';
import {act,cleanup,render} from '@testing-library/react';
import type {FloorplanUnit} from '@/lib/move-in/floorplan';
const {refresh}=vi.hoisted(()=>({refresh:vi.fn()}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
import {FloorplanClient} from '@/components/move-in/floorplan-client';
afterEach(()=>{cleanup();vi.useRealTimers();refresh.mockClear();});
test('refresh on focus and periodic reads; updated props recolor the tile',()=>{
 vi.useFakeTimers();
 const u:FloorplanUnit={projectId:'p',unitId:'u',buildingNo:'101',unitNo:'201',floor:2,currentGrade:'D',funding:'NORMAL',moveIn:'CONTACTED',effectiveIntent:'UNDECIDED',rentalType:null,specialReasons:[],balancePaidAt:null,actualMoveInDate:null,revision:'r',fetchedAt:'2026-11-06'};
 const view=render(createElement(FloorplanClient,{projectId:'p',units:[u],initialBuildingNo:'101'}));
 expect(view.container.querySelector('[data-balance-paid]')).toBeNull();
 act(()=>{window.dispatchEvent(new Event('focus'));});expect(refresh).toHaveBeenCalledTimes(1);
 act(()=>{vi.advanceTimersByTime(30_000);});expect(refresh).toHaveBeenCalledTimes(2);
 view.rerender(createElement(FloorplanClient,{projectId:'p',units:[{...u,balancePaidAt:'2026-11-06'}],initialBuildingNo:'101'}));
 expect(view.container.querySelector('[data-balance-paid="true"]')?.className).toContain('bg-green-100');
});
