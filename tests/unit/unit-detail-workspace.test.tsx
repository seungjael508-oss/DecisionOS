/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import {
  UnitDetailWorkspace,
  useUnitDetailWorkspace,
} from "@/components/move-in/unit-detail-workspace";

function DirtyProbe() {
  const workspace = useUnitDetailWorkspace();
  if (!workspace) return null;
  return <button type="button" onClick={() => workspace.setDirty(true)}>수정 시작</button>;
}

const returnTo = "/projects/p1/move-in/units?grade=C&buildingNo=103&intent=SALE_TRANSFER&sort=unit&cursor=c2";
const previousHref = "/projects/p1/move-in/units/u1?returnTo=encoded";
const nextHref = "/projects/p1/move-in/units/u3?returnTo=encoded";

describe("UnitDetailWorkspace", () => {
  beforeEach(() => replace.mockReset());
  afterEach(cleanup);

  it("returns to the exact filtered URL when closing without saving", () => {
    render(<UnitDetailWorkspace returnTo={returnTo} previousHref={previousHref} nextHref={nextHref}><DirtyProbe /></UnitDetailWorkspace>);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(replace).toHaveBeenCalledWith(returnTo);
  });

  it("navigates to the server-resolved previous and next routes without saving", () => {
    render(<UnitDetailWorkspace returnTo={returnTo} previousHref={previousHref} nextHref={nextHref}><DirtyProbe /></UnitDetailWorkspace>);
    fireEvent.click(screen.getByRole("button", { name: "이전 세대" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 세대" }));
    expect(replace).toHaveBeenNthCalledWith(1, previousHref);
    expect(replace).toHaveBeenNthCalledWith(2, nextHref);
  });

  it("protects dirty navigation until the user confirms discard", () => {
    render(<UnitDetailWorkspace returnTo={returnTo} previousHref={previousHref} nextHref={nextHref}><DirtyProbe /></UnitDetailWorkspace>);
    fireEvent.click(screen.getByRole("button", { name: "수정 시작" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 세대" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("저장하지 않은 변경사항이 있습니다.");
    fireEvent.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다음 세대" }));
    fireEvent.click(screen.getByRole("button", { name: "저장하지 않고 이동" }));
    expect(replace).toHaveBeenCalledWith(nextHref);
  });

  it("disables previous at the first row and returns last next to the filtered list notice", () => {
    const lastReturnTo = `${returnTo}&moveInNotice=last`;
    render(<UnitDetailWorkspace returnTo={returnTo} previousHref={null} nextHref={null} lastNextHref={lastReturnTo}><DirtyProbe /></UnitDetailWorkspace>);
    expect((screen.getByRole("button", { name: "이전 세대" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "다음 세대" }));
    expect(replace).toHaveBeenCalledWith(lastReturnTo);
  });
});
