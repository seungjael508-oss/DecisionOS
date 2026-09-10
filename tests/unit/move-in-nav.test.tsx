/** @vitest-environment jsdom */

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects/p1/move-in",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { MoveInNav } from "@/components/move-in/move-in-nav";

describe("move-in import navigation", () => {
  it("shows import only for PROJECT_ADMIN", () => {
    const { rerender } = render(
      <MoveInNav projectId="p1" projectName="현장" role="PROJECT_ADMIN" />,
    );
    expect(screen.getByText("데이터 가져오기")).toBeTruthy();

    rerender(<MoveInNav projectId="p1" projectName="현장" role="COUNSELOR" />);
    expect(screen.queryByText("데이터 가져오기")).toBeNull();
  });
});
