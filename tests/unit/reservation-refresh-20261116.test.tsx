// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import identities from '../fixtures/reservation-current-identities.json';
import bookings from '../fixtures/reservation-booked-20261116.json';
vi.mock('server-only', () => ({}));
import { floorplanReservationFor } from '@/lib/move-in/floorplan-reservations.server';
import { attachLedgerManagement } from '@/lib/move-in/ledger-management.server';
import { FloorplanBoard } from '@/components/move-in/floorplan-board';
import { LedgerTable } from '@/components/move-in/ledger-table';
import { LedgerCardList } from '@/components/move-in/ledger-card-list';
import type { LedgerSummaryRow } from '@/lib/move-in/ledger-types';
import type { FloorplanUnit } from '@/lib/move-in/floorplan';

const expected = new Map(bookings.map(row => [row.key, row]));
const key = (row: {buildingNo: string; unitNo: string}) => `${Number(row.buildingNo)}-${Number(row.unitNo)}`;
const rows = identities.map((row, index) => ({
  projectId: row.project_id, unitId: row.unit_id, buildingNo: row.building_no, unitNo: row.unit_no,
  currentContractId: row.contract_id, currentCustomerId: row.customer_id,
  currentGrade: index % 2 ? 'D' : 'A', funding: 'NORMAL', moveIn: 'NOT_CONTACTED',
  effectiveIntent: 'UNDECIDED', rentalType: null, specialReasons: [], sourceTags: [],
  problemFlags: [], problemLockReleased: false, balancePaidAt: index % 3 ? null : '2026-11-01T00:00:00Z',
  actualMoveInDate: null, revision: 'test', fetchedAt: '2026-11-16', dealTypes: [],
  contactStatus: 'NONE', lastContact: null, lastAttempt: null, nextContact: null, assigneeId: null, dGradeReasons: [],
  management: {loanAgreement:'UNKNOWN', moveReservation:'BOOKED', movingDate:'1900-01-01', problemHousehold:'UNKNOWN', managementReasons:[]},
} as unknown as LedgerSummaryRow));

test('latest source returns exact workbook tuples and clears released bookings in both projections', () => {
  const found: string[] = [];
  for (const row of rows) {
    const source = expected.get(key(row));
    const want = source ? {moveReservation:'BOOKED', movingDate:source.movingDate, movingTime:source.movingTime}
      : {moveReservation:'NONE', movingDate:null, movingTime:null};
    expect(floorplanReservationFor(row), key(row)).toEqual(want);
    const before = structuredClone(row);
    const after = attachLedgerManagement(row);
    expect(after.management, key(row)).toMatchObject(want);
    expect({...after, management:row.management}).toEqual(row);
    expect(row).toEqual(before);
    if (source) found.push(key(row));
  }
  expect(found.sort()).toEqual([...expected.keys()].sort());
  expect(found).toHaveLength(339);
  for (const released of ['108-304','101-802','105-902']) {
    expect(floorplanReservationFor(rows.find(row => key(row) === released)!)).toEqual({moveReservation:'NONE',movingDate:null,movingTime:null});
  }
});

test('every identity mismatch hides booking dates and times in ledger and floorplan', () => {
  const row = rows.find(row => expected.has(key(row)))!;
  for (const field of ['projectId','unitId','buildingNo','unitNo','currentContractId','currentCustomerId'] as const) {
    const changed = {...row, [field]:'different'};
    expect(floorplanReservationFor(changed)).toEqual({moveReservation:'UNKNOWN',movingDate:null,movingTime:null});
    expect(attachLedgerManagement(changed).management).toMatchObject({moveReservation:'UNKNOWN',movingDate:null,movingTime:null});
  }
});

test('ledger table, cards and floorplan render the same 339 dates and times and preserve detail links', () => {
  const ledger = rows.map(row => attachLedgerManagement(row));
  const units = rows.map(row => ({...row, floor:null, ...floorplanReservationFor(row)})) as FloorplanUnit[];
  const htmls = [
    renderToStaticMarkup(createElement(LedgerTable, {rows:ledger,assignees:{}})),
    renderToStaticMarkup(createElement(LedgerCardList, {rows:ledger,assignees:{}})),
    renderToStaticMarkup(createElement(FloorplanBoard, {projectId:rows[0].projectId,units})),
  ];
  const parser = new DOMParser();
  for (const html of htmls) {
    const document = parser.parseFromString(html, 'text/html');
    const reserved = [...document.querySelectorAll('[data-move-reserved="true"]')];
    expect(reserved).toHaveLength(339);
    const actual = reserved.map(node => {
      const unitId = node.getAttribute('data-unit-id') ?? node.getAttribute('href')?.split('/').pop();
      const row = rows.find(row => row.unitId === unitId)!;
      const source = expected.get(key(row))!;
      expect(node.textContent).toContain(`${source.movingDate.slice(5).replace('-','.')} ${source.movingTime}`);
      return key(row);
    });
    expect(actual.sort()).toEqual([...expected.keys()].sort());
  }
  const floorplan = parser.parseFromString(htmls[2], 'text/html');
  const links = [...floorplan.querySelectorAll<HTMLAnchorElement>('a[href*="/units/"]')];
  expect(links).toHaveLength(851);
  expect(new Set(links.map(link => link.href)).size).toBe(851);
  for (const link of links) {
    const row = rows.find(row => row.unitId === link.getAttribute('href')?.split('/').pop())!;
    expect(link.getAttribute('data-balance-paid') === 'true').toBe(Boolean(row.balancePaidAt));
    expect(link.querySelector('[data-grade]')?.getAttribute('data-grade')).toBe(row.currentGrade);
  }
}, 30000);
