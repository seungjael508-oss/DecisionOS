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

export function LoadingState() {
  return (
    <p role="status" className="p-8 text-neutral-700">
      불러오는 중…
    </p>
  );
}
