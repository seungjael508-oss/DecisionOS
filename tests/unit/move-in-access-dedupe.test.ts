import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// React Server Components의 실제 요청 경계에서 중복 제거 및 권한 격리를 검증한다.
describe("move-in request-scoped authorization", () => {
  it("deduplicates within a render and rechecks new users, projects and revoked membership", () => {
    const stdout = execFileSync(process.execPath, [
      "--conditions=react-server", "tests/fixtures/move-in-access-rsc.mjs",
    ], { cwd: process.cwd(), encoding: "utf8" });
    expect(JSON.parse(stdout)).toEqual({
      mode: "after",
      firstCounts: { user: 1, member: 1, project: 1 },
      requestIsolation: "PASS", projectIsolation: "PASS",
      revokedMembership: "PASS", unauthenticated: "PASS",
    });
  });
});
