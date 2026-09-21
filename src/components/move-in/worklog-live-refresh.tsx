"use client";

// 3인 실시간 업무일지: consultation 변경을 구독해 업무일지 화면을 자동 갱신한다.
// - Realtime 연결 시: INSERT/UPDATE 이벤트를 300ms 디바운스 후 router.refresh().
// - Realtime 미연결(끊김/실패) 시: 10초 간격 폴백 폴링.
// - 탭이 다시 보이면 즉시 한 번 갱신 (백그라운드에 있는 동안 놓친 변경 반영).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 400;
const FALLBACK_POLL_MS = 10_000;

type ConnectionStatus = "connected" | "disconnected";

export function WorklogLiveRefresh({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // 최신 router/status를 인터벌·이벤트 콜백 안에서 참조하기 위한 ref.
  // (매 렌더마다 채널을 새로 구독하지 않도록 useEffect 의존성은 projectId만 둔다.)
  const statusRef = useRef<ConnectionStatus>("disconnected");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const supabase = createBrowserClient();

    const refreshNow = () => {
      router.refresh();
      setLastRefreshedAt(new Date());
    };

    const scheduleRefresh = () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(refreshNow, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`worklog-consultation-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "consultation", filter: `project_id=eq.${projectId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "consultation", filter: `project_id=eq.${projectId}` },
        scheduleRefresh,
      )
      .subscribe((subscribeStatus) => {
        setStatus(subscribeStatus === "SUBSCRIBED" ? "connected" : "disconnected");
      });

    // Realtime이 끊긴 상태에서만 동작하는 폴백. 연결이 살아있으면 이벤트 기반 갱신만으로 충분하다.
    const fallbackInterval = setInterval(() => {
      if (statusRef.current === "disconnected") refreshNow();
    }, FALLBACK_POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router는 안정적인 참조이며 재구독 트리거로 삼지 않는다.
  }, [projectId]);

  return (
    <p className="mt-1 text-sm text-neutral-600">
      {status === "connected" ? "● 실시간 연결됨" : "자동 갱신 중"}
      {lastRefreshedAt ? (
        <> · 최종 갱신 {new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(lastRefreshedAt)}</>
      ) : null}
    </p>
  );
}
