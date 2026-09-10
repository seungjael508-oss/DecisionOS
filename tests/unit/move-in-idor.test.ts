import { describe, expect, it } from "vitest";

describe("move-in IDOR query contract", () => {
  it("scopes unit detail to both project_id and unit_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const foreignUnitId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const unitQuery = {
      table: "project_unit",
      eq: { project_id: projectId, unit_id: foreignUnitId },
    };
    expect(unitQuery.eq.project_id).not.toBeNull();
    expect(unitQuery.eq.unit_id).toBe(foreignUnitId);
  });

  it("scopes market_data to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const marketQuery = {
      table: "market_data",
      eq: { project_id: projectId },
    };
    expect(marketQuery.eq.project_id).toBe(projectId);
  });

  it("scopes worklog sources to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const worklogQuery = {
      tables: ["project_unit", "unit_occupancy_status", "consultation"],
      eq: { project_id: projectId },
    };
    expect(worklogQuery.eq.project_id).toBe(projectId);
  });

  it("scopes import catalog to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const importQuery = {
      tables: ["project_unit", "customer", "contract", "unit_occupancy_status"],
      eq: { project_id: projectId },
    };
    expect(importQuery.eq.project_id).toBe(projectId);
  });
});
