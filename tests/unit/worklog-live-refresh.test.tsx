/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ChangeFilter = { event: string; schema: string; table: string; filter: string };
type ChangeHandler = (payload: unknown) => void;

const mocks = vi.hoisted(() => {
  const refresh = vi.fn();
  const removeChannel = vi.fn();
  const handlers: Record<string, ChangeHandler> = {};
  const filters: ChangeFilter[] = [];
  let subscribeCallback: ((status: string) => void) | null = null;

  const channelObj = {
    on: vi.fn((_kind: string, filter: ChangeFilter, cb: ChangeHandler) => {
      filters.push(filter);
      handlers[filter.event] = cb;
      return channelObj;
    }),
    subscribe: vi.fn((cb: (status: string) => void) => {
      subscribeCallback = cb;
      return channelObj;
    }),
  };
  const channel = vi.fn(() => channelObj);

  return {
    refresh,
    removeChannel,
    handlers,
    filters,
    channel,
    fireStatus: (status: string) => subscribeCallback?.(status),
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({ channel: mocks.channel, removeChannel: mocks.removeChannel }),
}));

import { WorklogLiveRefresh } from "@/components/move-in/worklog-live-refresh";

describe("WorklogLiveRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.refresh.mockReset();
    mocks.removeChannel.mockReset();
    mocks.channel.mockClear();
    for (const key of Object.keys(mocks.handlers)) delete mocks.handlers[key];
    mocks.filters.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("consultation 변경 구독을 현재 project_id로 필터링한다", () => {
    render(<WorklogLiveRefresh projectId="hwayang-proj" />);
    expect(mocks.filters.length).toBeGreaterThan(0);
    for (const filter of mocks.filters) {
      expect(filter.table).toBe("consultation");
      expect(filter.filter).toBe("project_id=eq.hwayang-proj");
    }
    expect(mocks.filters.map((f) => f.event)).toEqual(expect.arrayContaining(["INSERT", "UPDATE"]));
  });

  it("INSERT 이벤트 발생 시 디바운스 후 router.refresh를 호출한다", () => {
    render(<WorklogLiveRefresh projectId="p1" />);
    act(() => mocks.fireStatus("SUBSCRIBED"));
    act(() => mocks.handlers.INSERT({}));
    expect(mocks.refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("짧은 시간 안에 여러 이벤트가 발생해도 한 번만 갱신한다 (디바운스)", () => {
    render(<WorklogLiveRefresh projectId="p1" />);
    act(() => {
      mocks.handlers.INSERT({});
      vi.advanceTimersByTime(100);
      mocks.handlers.UPDATE({});
      vi.advanceTimersByTime(100);
      mocks.handlers.INSERT({});
      vi.advanceTimersByTime(400);
    });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("Realtime 연결이 끊기면 10초마다 자동 갱신 폴백이 동작한다", () => {
    render(<WorklogLiveRefresh projectId="p1" />);
    act(() => mocks.fireStatus("CHANNEL_ERROR"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });

  it("Realtime이 연결된 상태에서는 폴백 폴링이 동작하지 않는다", () => {
    render(<WorklogLiveRefresh projectId="p1" />);
    act(() => mocks.fireStatus("SUBSCRIBED"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("연결 상태에 따라 '● 실시간 연결됨' / '자동 갱신 중' 문구를 표시한다", () => {
    render(<WorklogLiveRefresh projectId="p1" />);
    expect(screen.getByText(/자동 갱신 중/)).toBeTruthy();
    act(() => mocks.fireStatus("SUBSCRIBED"));
    expect(screen.getByText(/● 실시간 연결됨/)).toBeTruthy();
  });
});
