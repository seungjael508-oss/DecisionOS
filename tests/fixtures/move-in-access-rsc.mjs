// 실제 RSC 요청 경계에서 권한 검사를 실행한다. Supabase I/O만 대체하며 React cache는 실제 구현이다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import ts from 'typescript';
import React from 'react';
import renderer from 'next/dist/compiled/react-server-dom-webpack/server.node.js';
const { renderToPipeableStream } = renderer;
const before = process.argv.includes('--before');
const source = before
  ? execFileSync('git', ['show', 'ded8559:src/lib/move-in/access.ts'], { encoding: 'utf8' })
  : fs.readFileSync('src/lib/move-in/access.ts', 'utf8');
let actor = 'user-a';
let membershipAllowed = true;
let calls = { user: 0, member: 0, project: 0 };
const client = {
  auth: { async getUser() { calls.user++; return { data: { user: actor ? { id: actor } : null }, error: null }; } },
  from(table) {
    const filters = {};
    return {
      select() { return this; },
      eq(key, value) { filters[key] = value; return this; },
      async maybeSingle() {
        if (table === 'project_member') {
          calls.member++;
          // 조회가 현재 사용자·프로젝트·활성 상태를 모두 제한하는지 검증한다.
          assert.equal(filters.user_id, actor);
          assert.equal(filters.active, true);
          assert.ok(filters.project_id);
          return { data: membershipAllowed ? { id: `${actor}-${filters.project_id}`, role: 'COUNSELOR', active: true } : null, error: null };
        }
        assert.equal(table, 'project');
        assert.ok(filters.id);
        calls.project++;
        return { data: { id: filters.id, name: 'Synthetic project' }, error: null };
      },
    };
  },
};
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require(name) {
    if (name === '@/lib/supabase/server') return { createServerClient: async () => client };
    if (name === 'react') return React;
    throw new Error(`Unexpected runtime import: ${name}`);
  },
});
const access = exportsObject.requireMoveInAccess;
async function render(projects) {
  const results = [];
  async function Consumer({ project }) {
    const result = await access(project);
    results.push(JSON.parse(JSON.stringify(result)));
    return React.createElement('span', null, result.ok ? result.userId : result.kind);
  }
  const tree = React.createElement(React.Fragment, null, ...projects.map((project, index) => React.createElement(Consumer, { project, key: index })));
  await new Promise((resolve, reject) => {
    const output = new PassThrough();
    output.resume();
    output.on('end', resolve);
    output.on('error', reject);
    renderToPipeableStream(tree, {}, { onError: reject }).pipe(output);
  });
  return results;
}
(async () => {
  const first = await render(['project-a', 'project-a', 'project-a']);
  assert.equal(first.length, 3);
  assert.ok(first.every(result => result.ok && result.userId === 'user-a'));
  const firstCounts = { ...calls };
  const expected = before ? 3 : 1;
  assert.deepEqual(firstCounts, { user: expected, member: expected, project: expected });
  actor = 'user-b'; calls = { user: 0, member: 0, project: 0 };
  const next = await render(['project-a']);
  assert.equal(next[0].userId, 'user-b');
  assert.deepEqual(calls, { user: 1, member: 1, project: 1 });
  calls = { user: 0, member: 0, project: 0 };
  const distinct = await render(['project-a', 'project-b']);
  assert.equal(new Set(distinct.map(result => result.projectId)).size, 2);
  assert.deepEqual(calls, { user: 2, member: 2, project: 2 });
  // 같은 사용자라도 다음 요청에서 권한을 회수하면 이전 성공을 재사용하지 않는다.
  membershipAllowed = false;
  assert.equal((await render(['project-a']))[0].kind, 'forbidden');
  actor = null;
  assert.equal((await render(['project-a']))[0].kind, 'unauthenticated');
  console.log(JSON.stringify({ mode: before ? 'before' : 'after', firstCounts, requestIsolation: 'PASS', projectIsolation: 'PASS', revokedMembership: 'PASS', unauthenticated: 'PASS' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
