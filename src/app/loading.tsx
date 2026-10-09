// 페이지 데이터를 기다리는 동안 개인 정보 없이 진행 상태를 알린다.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="p-8 text-neutral-600">
      화면을 불러오는 중입니다…
    </div>
  );
}
