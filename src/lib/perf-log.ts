// 서버 처리 단계별 소요시간(ms)을 한 줄로 남긴다(Vercel 런타임 로그 `[perf]`). 식별자·고객 정보는 넣지 않는다.
export function startPerfLog(label: string) {
  const start = performance.now();
  let last = start;
  const steps: Record<string, number> = {};
  return {
    step(name: string) {
      const now = performance.now();
      steps[name] = Math.round(now - last);
      last = now;
    },
    end(extra: Record<string, number | string | boolean> = {}) {
      console.info(`[perf] ${label} ${JSON.stringify({ ...steps, total: Math.round(performance.now() - start), ...extra })}`);
    },
  };
}
