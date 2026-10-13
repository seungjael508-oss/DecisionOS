"use client";

export default function MoveInError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">데이터를 불러오지 못했습니다.</h1>
      <button
        type="button"
        className="mt-4 border border-neutral-800 px-3 py-1"
        onClick={() => reset()}
      >
        다시 시도
      </button>
    </main>
  );
}
