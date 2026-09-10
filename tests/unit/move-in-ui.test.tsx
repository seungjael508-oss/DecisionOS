/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/move-in/status-copy";
import { OccupancyStatusCards } from "@/components/move-in/occupancy-status-cards";
import type { OccupancyRecord } from "@/lib/move-in/queries";

describe("move-in empty and status UI", () => {
  it("renders the unit empty copy", () => {
    render(<EmptyState>등록된 동호수가 없습니다.</EmptyState>);
    expect(screen.getByText("등록된 동호수가 없습니다.")).toBeTruthy();
  });

  it("renders occupancy axes separately with Korean labels", () => {
    const occupancy = {
      occupancy_intent: "SELF_MOVE_IN",
      funding_status: "FUNDING_SHORTAGE",
      move_in_status: "CONTACTED",
    } as OccupancyRecord;
    render(<OccupancyStatusCards occupancy={occupancy} />);
    expect(screen.getByText("입주의향")).toBeTruthy();
    expect(screen.getByText("실입주")).toBeTruthy();
    expect(screen.getByText("자금상태")).toBeTruthy();
    expect(screen.getByText("자금부족")).toBeTruthy();
    expect(screen.getByText("입주진행")).toBeTruthy();
    expect(screen.getByText("접촉완료")).toBeTruthy();
  });
});
