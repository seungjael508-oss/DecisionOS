import { expect, test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';

test('all buildings share floor rows and only paid units have color', () => {
  const base: FloorplanUnit = { projectId:'p', unitId:'a', buildingNo:'101', unitNo:'301', floor:3, currentGrade:'D', funding:'LOAN_NEEDED', moveIn:'CONTACTED', effectiveIntent:'UNDECIDED', rentalType:null, specialReasons:['DELINQUENT'], balancePaidAt:null, actualMoveInDate:null, revision:'r', fetchedAt:'2026-11-07' };
  const html = renderToStaticMarkup(createElement(FloorplanBoard, {projectId:'p', units:[base, {...base, unitId:'b', buildingNo:'102', unitNo:'201', floor:2, balancePaidAt:'2026-11-07'}]}));
  expect(html).toContain('101동');
  expect(html).toContain('102동');
  expect(html).toContain('data-floor="3"');
  expect(html).toContain('data-floor="2"');
  const unpaidTile = html.match(/<a\b[^>]*href="\/projects\/p\/move-in\/units\/a"[^>]*>[\s\S]*?<\/a>/)?.[0];
  expect(unpaidTile).toContain('bg-white');
  expect(unpaidTile).not.toContain('bg-green-100');
  expect(html).toContain('bg-green-100');
  expect(html).not.toContain('bg-red-200');
  expect(html).not.toContain('현재등급 범례');
  expect(html).not.toContain('보조 태그 범례');
});
