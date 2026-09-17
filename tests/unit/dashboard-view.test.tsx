// @vitest-environment jsdom
import { render, screen, within, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DashboardSummary } from '@/components/move-in/dashboard-summary';
import { buildDashboardActivity, computeMoveInKpis, legacyDashboardSnapshot } from '@/lib/move-in/kpis';
afterEach(cleanup);
it('separates initial grade, legacy linkage and occupancy without calling 850 units uncontacted',()=>{
 render(<DashboardSummary projectName="Synthetic" projectId="p" data={{date:'2026-09-17',initial:legacyDashboardSnapshot('1283e198-5043-4027-96d6-edcc7a6686c6','PROJECT_ADMIN'),totalUnits:851,legacyLinked:848,sourceReview:3,nextScheduled:1,activity:buildDashboardActivity([],[],'2026-09-17T05:00:00Z'),occupancy:computeMoveInKpis(851,[])}}/>);
 expect(screen.getByText('과거 상담이력 연결 848세대')).toBeTruthy();
 expect(screen.getByText('원천 연결 확인 필요 3세대')).toBeTruthy();
 expect(within(screen.getByRole('region',{name:'Legacy 초기 현황'})).getByText('245')).toBeTruthy();
 expect(screen.queryByText('미접촉')).toBeNull();
 expect(screen.getByText(/입주진행 미설정/)).toBeTruthy();
 expect(screen.getByRole('link',{name:'동호수 관리 · 상담이력'}).getAttribute('href')).toBe('/projects/p/move-in/units');
});
