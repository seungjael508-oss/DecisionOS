/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/move-in/status-copy";

describe("market empty copy", () => {
  it("renders the three required empty messages", () => {
    render(
      <>
        <EmptyState>등록된 시장 데이터가 없습니다.</EmptyState>
        <EmptyState>등록된 경쟁단지 데이터가 없습니다.</EmptyState>
        <EmptyState>등록된 타입별 데이터가 없습니다.</EmptyState>
      </>,
    );
    expect(screen.getByText("등록된 시장 데이터가 없습니다.")).toBeTruthy();
    expect(screen.getByText("등록된 경쟁단지 데이터가 없습니다.")).toBeTruthy();
    expect(screen.getByText("등록된 타입별 데이터가 없습니다.")).toBeTruthy();
  });
});
