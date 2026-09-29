// @vitest-environment jsdom
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { formatDateTime } from '@/lib/move-in/labels';
import { ConsultationHistory } from '@/components/move-in/consultation-history';

const cases = [
  ['2026-07-14T02:11:08.327Z', '2026.07.14 11:11'],
  ['2026-07-14T06:05:55.258Z', '2026.07.14 15:05'],
  ['2026-09-09T15:30:00Z', '2026.09.10 00:30'],
  ['2026-09-29T10:15:00Z', '2026.09.29 19:15'],
] as const;
afterEach(cleanup);

it.each(cases)('formats %s as a deterministic KST numeric string', (input, expected) => {
  expect(formatDateTime(input)).toBe(expected);
  expect(formatDateTime(input)).not.toMatch(/AM|PM|오전|오후/);
});

it('returns the same KST results in a separate UTC runtime', () => {
  const source = readFileSync(resolve('src/lib/move-in/labels.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const script = `${code}\nconsole.log(JSON.stringify({zone:Intl.DateTimeFormat().resolvedOptions().timeZone,values:${JSON.stringify(cases.map(([input]) => input))}.map(exports.formatDateTime)}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['-e', script], {
    env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8',
  }));
  expect(result.zone).toBe('UTC');
  expect(result.values).toEqual(cases.map(([, expected]) => expected));
  expect(result.values).toEqual(cases.map(([input]) => formatDateTime(input)));
});

it('uses the established fallback for null and invalid timestamps', () => {
  expect(formatDateTime(null)).toBe('—');
  expect(formatDateTime('not-a-timestamp')).toBe('—');
});

it.each([true, false])('uses the shared KST formatter in the timeline (legacy=%s)', (legacyImported) => {
  render(<ConsultationHistory currentMemberId="synthetic-member" rows={[{
    id:'synthetic-event', consultedAt:cases[2][0], contactType:'CALL', purpose:null,
    content:'Synthetic consultation', nextActionAt:null, counselorId:'synthetic-member',
    legacyGrade:'C', legacyImported,
  }]}/>);
  expect(screen.getByText(cases[2][1])).toBeTruthy();
});
