import { describe, expect, it } from "vitest";
import { canSelectDGrade, counselorDisplayName } from "@/lib/move-in/consultation";
import { assigneeLabel, ledgerOptionLabel } from "@/lib/move-in/ledger-presentation";

const ID = "ca596714-09fb-4fb5-8c77-b8350c68df03";
const ME = "41000000-0000-4000-8000-000000000001";

describe("담당 상담사 이름 표시", () => {
  it("display_name이 있으면 이름", () => {
    expect(counselorDisplayName(ID, ME, "송용석")).toBe("송용석");
    expect(assigneeLabel(ID, { [ID]: "송용석" })).toBe("송용석");
  });
  it("이름 없음·조회 불가면 '담당상담사'이고 member ID를 노출하지 않는다", () => {
    for (const name of [undefined, null, "", "  "]) expect(counselorDisplayName(ID, ME, name)).toBe("담당상담사");
    expect(assigneeLabel(ID, {})).toBe("담당상담사");
    expect(assigneeLabel(ID, {})).not.toContain(ID.slice(0, 8));
  });
  it("운영 상담사 b3333d51…는 박진하로 표시되고, 맵에 없으면 UUID 대신 '담당상담사'", () => {
    const PARK = "b3333d51-11d3-45ca-9aa4-671035aeadd5";
    const names = { [PARK]: "박진하" };
    expect(assigneeLabel(PARK, names)).toBe("박진하");
    expect(ledgerOptionLabel("assignee", PARK, names)).toBe("박진하");
    expect(counselorDisplayName(PARK, ME, names[PARK])).toBe("박진하");
    for (const label of [assigneeLabel(PARK, {}), ledgerOptionLabel("assignee", PARK, {}), counselorDisplayName(PARK, ME, null)]) {
      expect(label).toBe("담당상담사");
      expect(label).not.toContain(PARK.slice(0, 8));
    }
  });
  it("본인·미배정 표시는 기존과 같다", () => {
    expect(counselorDisplayName(ME, ME, "송용석")).toBe("나");
    expect(counselorDisplayName(null, ME)).toBe("—");
    expect(assigneeLabel(null, {})).toBe("미배정");
  });
});

describe("D 선택 표시 제한(RPC가 다시 검증)", () => {
  it("관리자·상담사는 D 선택 가능", () => {
    expect(canSelectDGrade("PROJECT_ADMIN", "C")).toBe(true);
    expect(canSelectDGrade("COUNSELOR", "C")).toBe(true);
    expect(canSelectDGrade("COUNSELOR", null)).toBe(true);
  });
  it("CLIENT_MANAGER는 기존처럼 이미 D인 세대의 재확인만", () => {
    expect(canSelectDGrade("CLIENT_MANAGER", "C")).toBe(false);
    expect(canSelectDGrade("CLIENT_MANAGER", "D")).toBe(true);
  });
});
