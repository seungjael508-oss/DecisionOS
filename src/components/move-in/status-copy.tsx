import Link from "next/link";

export function AccessDenied({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">{message}</h1>
      <p className="mt-3">
        <Link className="underline" href="/">
          프로젝트 목록으로
        </Link>
      </p>
    </main>
  );
}

export function QueryError() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">데이터를 불러오지 못했습니다.</h1>
    </main>
  );
}

export function EmptyState({ children }: { children: string }) {
  return <p className="border border-neutral-300 p-6 text-neutral-700">{children}</p>;
}

// 메뉴 전환 시 사이드바는 유지되고 이 영역(오른쪽 본문)만 자리 표시로 바뀐다.
export function LoadingState() {
  return (
    <div role="status" aria-live="polite" data-content-skeleton className="p-8">
      <span className="sr-only">불러오는 중…</span>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-7 w-48 rounded bg-neutral-200" />
        <div className="h-20 rounded border border-neutral-200 bg-neutral-100" />
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-6 rounded bg-neutral-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
