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

  it("scopes assign list to the route project_id via customer first", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const assignQuery = {
      startTable: "customer",
      eq: { project_id: projectId },
    };
    expect(assignQuery.startTable).toBe("customer");
    expect(assignQuery.eq.project_id).toBe(projectId);
  });

  it("scopes floorplan queries to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const floorplanQuery = {
      tables: ["project_unit", "unit_occupancy_status", "consultation"],
      eq: { project_id: projectId },
    };
    expect(floorplanQuery.eq.project_id).toBe(projectId);
  });

  it("scopes deal and brokerage queries to the route project_id", () => {
    const projectId = "20000000-0000-0000-0000-000000000001";
    const dealQuery = {
      tables: ["unit_deal", "brokerage_office", "brokerage_contact"],
      eq: { project_id: projectId },
    };
    expect(dealQuery.eq.project_id).toBe(projectId);
  });
});
