import { describe, expect, it } from "vitest";
import { getProblemUnitPresentation } from "@/lib/move-in/problem-unit-presentation";
import {
  OPERATIONAL_INTENT_LABELS,
  OPERATIONAL_INTENT_VALUES,
} from "@/lib/move-in/labels";

describe("getProblemUnitPresentation", () => {
  it.each([
    [["LEGAL"], "RED"],
    [["CREDIT"], "ORANGE"],
    [["REPEATED_NO_CONTACT"], "YELLOW"],
    [["TRANSFER"], "BLUE"],
    [["PAYMENT_READY"], "GREEN"],
    [["UNKNOWN"], "GRAY"],
  ] as const)("maps %j to %s", (categories, color) => {
    expect(getProblemUnitPresentation({ problemCategories: categories }).color).toBe(color);
  });

  it("uses the documented severity precedence instead of input order", () => {
    expect(
      getProblemUnitPresentation({
        problemCategories: ["SALE", "PAYMENT_READY", "LEGAL"],
      }).color,
    ).toBe("RED");
  });

  it("maps each operational intent to its documented Korean label", () => {
    expect(OPERATIONAL_INTENT_VALUES).toEqual([
      "MOVE_IN",
      "CONSIDERING_MOVE_IN",
      "SALE_TRANSFER",
      "RENT",
      "TERMINATION",
      "ABANDONMENT",
      "UNDECIDED",
    ]);
    expect(OPERATIONAL_INTENT_LABELS).toMatchObject({
      MOVE_IN: "입주",
      CONSIDERING_MOVE_IN: "입주 고려",
      SALE_TRANSFER: "전매/매도",
      RENT: "전세/월세",
      TERMINATION: "해지",
      ABANDONMENT: "포기",
      UNDECIDED: "미확정",
    });
  });

  it.each([
    ["MOVE_IN", "GREEN"],
    ["CONSIDERING_MOVE_IN", "GRAY"],
    ["SALE_TRANSFER", "BLUE"],
    ["RENT", "BLUE"],
    ["TERMINATION", "YELLOW"],
    ["ABANDONMENT", "YELLOW"],
    ["UNDECIDED", "GRAY"],
  ] as const)("maps operational intent %s to %s", (operationalIntent, color) => {
    expect(getProblemUnitPresentation({ operationalIntent }).color).toBe(color);
  });

  it("keeps RED problem severity over a SALE_TRANSFER blue intent", () => {
    expect(
      getProblemUnitPresentation({
        problemCategories: ["LEGAL"],
        operationalIntent: "SALE_TRANSFER",
      }).color,
    ).toBe("RED");
  });

  it("always supplies a text badge alongside the color token", () => {
    const presentation = getProblemUnitPresentation({
      problemCategories: ["LOAN_BLOCKED"],
    });
    expect(presentation.badgeLabel).toBe("대출 제한");
    expect(presentation.color).toBe("ORANGE");
  });
});
