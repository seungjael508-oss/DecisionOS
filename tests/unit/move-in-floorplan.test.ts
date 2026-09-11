import { describe, expect, it } from "vitest";
import {
  buildFloorplanGrid,
  cellKey,
  floorplanCellTone,
  listBuildings,
  parseHoLayout,
  selectBuilding,
  type FloorplanUnit,
} from "@/lib/move-in/floorplan";

function unit(
  partial: Partial<FloorplanUnit> & Pick<FloorplanUnit, "unitId" | "unitNo">,
): FloorplanUnit {
  return {
    buildingNo: "106",
    floor: null,
    occupancyIntent: "SELF_MOVE_IN",
    fundingStatus: "NORMAL",
    moveInStatus: "PLANNED",
    latestGrade: "B",
    ...partial,
  };
}

describe("floorplan layout", () => {
  it("parses Korean ho numbers into floor and line", () => {
    expect(parseHoLayout("1501")).toEqual({ floor: 15, line: 1 });
    expect(parseHoLayout("1404")).toEqual({ floor: 14, line: 4 });
    expect(parseHoLayout("501")).toEqual({ floor: 5, line: 1 });
    expect(parseHoLayout("1010")).toEqual({ floor: 10, line: 10 });
  });

  it("prefers stored floor when present", () => {
    expect(parseHoLayout("1501", 16)).toEqual({ floor: 16, line: 1 });
  });

  it("leaves non-ho strings unparsed unless a floor hint exists", () => {
    expect(parseHoLayout("A동펜트")).toBeNull();
    expect(parseHoLayout("12", 3)).toEqual({ floor: 3, line: 12 });
  });

  it("lists buildings numerically and falls back when the requested dong is missing", () => {
    expect(
      listBuildings([
        unit({ unitId: "1", unitNo: "101", buildingNo: "106" }),
        unit({ unitId: "2", unitNo: "101", buildingNo: "101" }),
        unit({ unitId: "3", unitNo: "101", buildingNo: "106" }),
      ]),
    ).toEqual(["101", "106"]);
    expect(selectBuilding(["101", "106"], "106")).toBe("106");
    expect(selectBuilding(["101", "106"], "999")).toBe("101");
  });

  it("builds a descending floor grid for one building", () => {
    const grid = buildFloorplanGrid(
      [
        unit({ unitId: "a", unitNo: "1501" }),
        unit({ unitId: "b", unitNo: "1502" }),
        unit({ unitId: "c", unitNo: "1401" }),
        unit({ unitId: "d", unitNo: "1501", buildingNo: "101" }),
        unit({ unitId: "e", unitNo: "펜트" }),
      ],
      "106",
    );
    expect(grid.floors).toEqual([15, 14]);
    expect(grid.lines).toEqual([1, 2]);
    expect(grid.cells.get(cellKey(15, 1))?.unitId).toBe("a");
    expect(grid.cells.get(cellKey(15, 2))?.unitNo).toBe("1502");
    expect(grid.unparsed.map((row) => row.unitId)).toEqual(["e"]);
  });

  it("colors cells by the selected axis and treats missing status as 미등록", () => {
    const planned = unit({ unitId: "a", unitNo: "1501", moveInStatus: "PLANNED" });
    expect(floorplanCellTone(planned, "moveInStatus").label).toBe("입주예정");
    expect(floorplanCellTone(planned, "occupancyIntent").label).toBe("실입주");
    expect(
      floorplanCellTone(
        unit({ unitId: "b", unitNo: "1502", latestGrade: "C" }),
        "legacyGrade",
      ).label,
    ).toBe("C");
    expect(
      floorplanCellTone(
        unit({
          unitId: "c",
          unitNo: "1503",
          moveInStatus: null,
          occupancyIntent: null,
          fundingStatus: null,
          latestGrade: null,
        }),
        "moveInStatus",
      ).label,
    ).toBe("미등록");
  });
});
