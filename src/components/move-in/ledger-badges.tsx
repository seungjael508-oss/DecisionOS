/** 통합원장 잔금완납 배지(TAS-20261023-01 규격: 배경 #dcfce7, 테두리 #86efac, 글자 #15803d). 잔여금액이 있으면 옆에 함께 표기 */
export function BalancePaidBadge({remainder}: {remainder: string | null}) {
  return <span className="inline-flex flex-wrap items-center gap-1 whitespace-nowrap">
    <span className="inline-flex items-center gap-0.5 rounded border border-green-300 bg-green-100 px-1.5 text-xs font-semibold text-green-700">
      <span aria-hidden="true">✓</span>잔금완납
    </span>
    {remainder?<span className="text-xs font-medium text-orange-800">{remainder}</span>:null}
  </span>;
}

/** 이사예약(예약현황 예약완료) 배지. 잔금완납 초록과 구분되는 파란색, 예약일(MM.DD)을 함께 표기 */
export function MoveReservationBadge({date}: {date: string | null}) {
  const day = date?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded border border-blue-300 bg-blue-50 px-1.5 text-xs font-semibold text-blue-800">
    <span aria-hidden="true">✓</span>이사예약{day?` ${day[1]}.${day[2]}`:''}
  </span>;
}
