// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { FloorplanClient } from '@/components/move-in/floorplan-client';
import { floorplanCellTone, type FloorplanUnit } from '@/lib/move-in/floorplan';
import { MoveInNav } from '@/components/move-in/move-in-nav';

// Only the Next.js route context is external; links and components stay real.
vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/p1/move-in/floorplan',
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

const base: FloorplanUnit = {
  projectId: 'p1', unitId: 'u1', buildingNo: '101', unitNo: '101', floor: 1,
  currentGrade: 'D', funding: 'NORMAL', moveIn: 'PLANNED',
  effectiveIntent: 'MOVE_IN', rentalType: null, specialReasons: [],
  balancePaidAt: null, actualMoveInDate: null, revision: 'r1', fetchedAt: '2026-11-07T09:00:00Z',
};

afterEach(cleanup);

describe('동호수관리 메뉴 복구', () => {
  test('모바일·데스크톱에서 기존 배치도 경로를 열고 선택 상태를 표시한다', () => {
    render(<MoveInNav projectId="p1" projectName="테스트 현장" role="PROJECT_ADMIN" />);
    const menus = screen.getAllByRole('navigation', { name: '입주촉진' });
    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      const link = within(menu).getByRole('link', { name: '동호수관리' });
      expect(link.getAttribute('href')).toBe('/projects/p1/move-in/floorplan');
      expect(link.getAttribute('aria-current')).toBe('page');
      for (const name of ['통합원장', '오늘 관리대상', '업무일지']) {
        expect(within(menu).getByRole('link', { name }).hasAttribute('aria-current')).toBe(false);
      }
    }
  });
});

describe('완납 배치도 표시', () => {
  test.each(['A', 'B', 'C', 'D', null])('완납이면 %s 등급보다 초록색이 우선하고 등급·태그·링크를 보존한다', (currentGrade) => {
    render(<FloorplanBoard projectId="p1" buildingNo="101" units={[{
      ...base, currentGrade, moveIn: 'BALANCE_PAID', specialReasons: ['ASEL', 'DELINQUENT'],
    }]} />);
    const tile = screen.getByRole('link', { name: /101동 101호 현재등급/ });
    expect(tile.className).toContain('bg-green-200');
    expect(tile.getAttribute('href')).toBe('/projects/p1/move-in/units/u1');
    expect(within(tile).getByText(currentGrade ?? '미등록')).toBeTruthy();
    for (const tag of ['잔금완납', '아셀', '연체자']) expect(within(tile).getByText(tag)).toBeTruthy();
    expect(within(screen.getByRole('list', { name: '현재등급 범례' })).getByText('잔금완납')).toBeTruthy();
  });

  test('실제입주로 상태가 바뀌어도 완납일이 있으면 초록색을 유지한다', () => {
    expect(floorplanCellTone({ ...base, moveIn: 'MOVED_IN', balancePaidAt: '2026-11-06T15:00:00Z' }).className)
      .toContain('bg-green-200');
  });

  test('실제입주만 있거나 미완납이면 기존 등급색을 유지한다', () => {
    const units: FloorplanUnit[] = [base, {
      ...base, unitId: 'u2', unitNo: '102', moveIn: 'MOVED_IN', actualMoveInDate: '2026-11-07',
    }];
    render(<FloorplanBoard projectId="p1" buildingNo="101" units={units} />);
    for (const tile of screen.getAllByRole('link')) {
      expect(tile.className).toContain('bg-red-200');
      expect(within(tile).queryByText('잔금완납')).toBeNull();
    }
    expect(screen.getByText('실제입주', { selector: 'a span span' })).toBeTruthy();
  });

  test('851세대의 상세 링크가 누락되지 않는다', () => {
    const units = Array.from({ length: 851 }, (_, index): FloorplanUnit => ({
      ...base, unitId: `u${index + 1}`, floor: Math.floor(index / 23) + 1,
      unitNo: `${Math.floor(index / 23) + 1}${String(index % 23 + 1).padStart(2, '0')}`,
      moveIn: index < 150 ? 'BALANCE_PAID' : 'PLANNED',
    }));
    render(<FloorplanBoard projectId="p1" buildingNo="101" units={units} />);
    const tiles = screen.getAllByRole('link');
    expect(tiles).toHaveLength(851);
    expect(new Set(tiles.map(tile => tile.getAttribute('href'))).size).toBe(851);
    expect(tiles.filter(tile => tile.className.includes('bg-green-200'))).toHaveLength(150);
    expect(tiles.map(tile => tile.getAttribute('href'))).toContain('/projects/p1/move-in/units/u851');
  });

  test('동 전환 시 선택한 동의 세대와 상세 링크를 표시한다', () => {
    render(<FloorplanClient projectId="p1" initialBuildingNo="101" units={[
      base, { ...base, buildingNo: '102', unitId: 'u2', unitNo: '201', floor: 2 },
    ]} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/projects/p1/move-in/units/u1');
    fireEvent.change(screen.getByRole('combobox', { name: '동' }), { target: { value: '102' } });
    expect(screen.getByRole('heading', { name: '102동' })).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/projects/p1/move-in/units/u2');
  });
});
