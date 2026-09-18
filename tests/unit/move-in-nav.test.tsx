/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/p1/move-in",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { MoveInNav } from "@/components/move-in/move-in-nav";

afterEach(() => {
  cleanup();
});

describe("move-in navigation", () => {
  it("shows import only for PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />,
    );
    expect(screen.getByText("데이터 가져오기")).toBeTruthy();

    rerender(<MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />);
    expect(screen.queryByText("데이터 가져오기")).toBeNull();
  });

  it("shows 동호배치도 for COUNSELOR and PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />,
    );
    expect(screen.getByRole("link", { name: "동호배치도" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/floorplan",
    );

    rerender(<MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />);
    expect(screen.getByText("동호배치도")).toBeTruthy();
  });

  it("shows 상담·콜 관리 for COUNSELOR and PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />,
    );
    expect(screen.getByText("상담·콜 관리")).toBeTruthy();
    expect(screen.getByRole("link", { name: "상담·콜 관리" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/calls",
    );

    rerender(<MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />);
    expect(screen.getByText("상담·콜 관리")).toBeTruthy();
  });

  it("shows 보고서 for COUNSELOR and PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />,
    );
    expect(screen.getByRole("link", { name: "보고서" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/reports",
    );

    rerender(<MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />);
    expect(screen.getByText("보고서")).toBeTruthy();
  });

  it("shows 상담사 배정 only for PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />,
    );
    expect(screen.getByText("상담사 배정")).toBeTruthy();
    expect(screen.getByRole("link", { name: "상담사 배정" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/assign",
    );

    rerender(<MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />);
    expect(screen.queryByText("상담사 배정")).toBeNull();
  });

  it("shows 매도·임대 관리 for COUNSELOR and PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />,
    );
    expect(screen.getByText("매도·임대 관리")).toBeTruthy();
    expect(screen.getByRole("link", { name: "매도·임대 관리" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/deals",
    );
    expect(screen.queryByText("중개업소 관리")).toBeNull();

    rerender(<MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />);
    expect(screen.getByText("매도·임대 관리")).toBeTruthy();
    expect(screen.getByText("중개업소 관리")).toBeTruthy();
    expect(screen.getByRole("link", { name: "중개업소 관리" }).getAttribute("href")).toBe(
      "/projects/p1/move-in/brokerages",
    );
  });
});

// 현장 메뉴는 같고 배정/이관 메뉴만 관리자 전용으로 남는다.
it('Hwayang counselor sees brokerage field menu without administration',()=>{
 render(<MoveInNav projectId="1283e198-5043-4027-96d6-edcc7a6686c6" projectName="화양" role="COUNSELOR"/>);
 expect(screen.getByText('중개업소 관리')).toBeTruthy();
 expect(screen.queryByText('데이터 가져오기')).toBeNull();
 expect(screen.queryByText('상담사 배정')).toBeNull();
});
