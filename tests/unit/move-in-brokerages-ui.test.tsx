/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveBrokerageOffice = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/projects/[projectId]/move-in/brokerages/actions", () => ({
  saveBrokerageOffice: (...args: unknown[]) => saveBrokerageOffice(...args),
}));

import { BrokerageBoard } from "@/components/move-in/brokerage-board";
import type { BrokerageOfficeOption } from "@/lib/move-in/brokerages";

const offices: BrokerageOfficeOption[] = [
  {
    id: "off-1",
    name: "익명공인",
    address: "익명시",
    mainPhone: "0211111111",
    active: false,
    contacts: [
      { id: "rep-1", role: "REP", name: "대표A", phone: "01000001111", active: true },
      { id: "m1", role: "MANAGER1", name: "실장A", phone: "01000001112", active: true },
    ],
  },
];

afterEach(() => {
  cleanup();
});

describe("brokerage admin UI", () => {
  beforeEach(() => {
    saveBrokerageOffice.mockReset();
    refresh.mockReset();
  });

  it("lists office fields and inactive state", () => {
    render(<BrokerageBoard projectId="p1" offices={offices} />);
    expect(screen.getByText("익명공인")).toBeTruthy();
    expect(screen.getByText("익명시")).toBeTruthy();
    expect(screen.getByText("0211111111")).toBeTruthy();
    expect(screen.getByText("대표A")).toBeTruthy();
    expect(screen.getByText("실장A")).toBeTruthy();
    expect(screen.getByText("비활성")).toBeTruthy();
  });

  it("registers a new office", async () => {
    saveBrokerageOffice.mockResolvedValue({ ok: true });
    render(<BrokerageBoard projectId="p1" offices={[]} />);
    fireEvent.change(screen.getByLabelText("업소명"), {
      target: { value: "신규공인" },
    });
    fireEvent.change(screen.getByLabelText("대표 이름"), {
      target: { value: "대표B" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "중개업소 저장" }).closest("form")!);
    await waitFor(() => {
      expect(saveBrokerageOffice).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "p1",
          name: "신규공인",
          contacts: expect.arrayContaining([
            expect.objectContaining({ role: "REP", name: "대표B" }),
          ]),
        }),
      );
    });
  });

  it("edits an existing office", async () => {
    saveBrokerageOffice.mockResolvedValue({ ok: true });
    render(<BrokerageBoard projectId="p1" offices={offices} />);
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("업소명"), {
      target: { value: "익명공인 수정" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "중개업소 저장" }).closest("form")!);
    await waitFor(() => {
      expect(saveBrokerageOffice).toHaveBeenCalledWith(
        expect.objectContaining({
          officeId: "off-1",
          name: "익명공인 수정",
        }),
      );
    });
  });
});
