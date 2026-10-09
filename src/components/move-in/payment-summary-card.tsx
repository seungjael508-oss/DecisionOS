import { formatDateTime } from "@/lib/move-in/labels";
import type { OccupancyRecord } from "@/lib/move-in/queries";
import { Fragment } from 'react';
import type { RegisteredPaymentProjection } from '@/lib/move-in/payment-projection.server';

/** Read-only selected-unit DTO. The complete payment artifact stays server-only. */
export function PaymentSummaryCard({ occupancy, projection }: { occupancy: OccupancyRecord | null; projection?: RegisteredPaymentProjection | null }) {
  if (projection) return <RegisteredPaymentCard projection={projection} />;
  const balancePaid = occupancy?.move_in_status === "BALANCE_PAID";
  const balancePaidAt = balancePaid ? occupancy?.balance_paid_at ?? null : null;
  return (
    <section className="mt-8 border border-neutral-300 p-4" aria-label="납부내역 및 잔금">
      <h2 className="text-lg font-semibold">납부내역 및 잔금</h2>
      <dl className="mt-3 grid max-w-xl grid-cols-[10rem_1fr] gap-y-1 text-sm">
        <dt>계약금 납부액</dt><dd>납부정보 미등록</dd>
        <dt>계약금 상태</dt><dd>납부정보 미등록</dd>
        <dt>중도금 납부액</dt><dd>납부정보 미등록</dd>
        <dt>중도금 대출 여부</dt><dd>납부정보 미등록</dd>
        <dt>현재 납부 누계</dt><dd>납부정보 미등록</dd>
        <dt>잔금 예정액</dt><dd>납부정보 미등록</dd>
        <dt>잔금 납부액</dt><dd>납부정보 미등록</dd>
        <dt>잔금 미납액</dt><dd>납부정보 미등록</dd>
        <dt>연체금</dt><dd>납부정보 미등록</dd>
        <dt>잔금 완납 여부</dt><dd>{balancePaid ? "완납 (입주진행 상태 기준)" : "납부정보 미등록"}</dd>
        <dt>잔금 완납일</dt><dd>{balancePaidAt ? formatDateTime(balancePaidAt) : "납부정보 미등록"}</dd>
      </dl>
    </section>
  );
}

const money = (value: number | null) => value == null ? '납부정보 미등록' : `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const statusLabels = { PAID: '완납', PARTIAL: '부분납', OVERDUE: '연체', UPCOMING: '납부예정' } as const;
const adjustmentLabels = {
  additionalScheduled: '추가납부 약정', additionalPaid: '추가납부 입금', additionalPrincipal: '추가납부 원금',
  additionalLateFee: '추가납부 연체료', excessAmount: '초과금액', refundAmount: '환불금액', unrefundedAmount: '미환불금액',
} as const;

function RegisteredPaymentCard({ projection }: { projection: RegisteredPaymentProjection }) {
  const metrics = [
    ['분양금액', money(projection.salePrice)], ['납부원금', money(projection.totalPrincipalPaid)],
    ['납부율', `${projection.paymentRate.toFixed(1)}%`], ['미납금', money(projection.balanceScheduled)],
    ['잔금 예정액', money(projection.finalBalanceScheduled)], ['연체료', money(projection.totalLateFee)],
  ];
  return <section className="mt-8 border border-neutral-300 p-4" aria-label="납부내역 및 잔금">
    <h2 className="text-lg font-semibold">납부내역 및 잔금</h2>
    <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map(([label,value])=><div className="min-w-0 border border-neutral-200 p-3" key={label}>
        <dt className="text-sm text-neutral-600">{label}</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums">{value}</dd>
      </div>)}
    </dl>
    <p className="mt-3 text-sm text-neutral-600">미납금은 분양금액에서 납부원금을 뺀 전체 잔여액으로, 미도래 잔금도 포함합니다. 실입금액·연체료·할인료는 납부원금과 별도입니다.</p>
    <p className="mt-1 text-sm text-neutral-600">자기자금 투입: 확인 필요</p>
    <details className="mt-4">
      <summary className="cursor-pointer font-semibold">차수별 납부내역</summary>
      <p className="mt-2 text-sm text-neutral-600">납부내역.xlsx 기준 · 상태 판정 {projection.asOfDate} (한국시간)</p>
      <p className="mt-1 text-sm text-neutral-600">분할 입금은 원천 행을 그대로 표시하며, 상태는 같은 차수·약정일의 합계 기준입니다.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[58rem] border-collapse text-sm" aria-label="차수별 납부내역">
          <thead><tr className="border-b-2 border-neutral-800 text-left">{['차수','약정일','약정금액','입금일','납부원금','실입금액','연체료','할인료','상태'].map(label=><th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
          <tbody>{projection.installments.map((row,index)=>{
            const adjustments = (Object.keys(adjustmentLabels) as (keyof typeof adjustmentLabels)[]).filter(key=>row[key]!==0);
            return <Fragment key={`${row.installmentType}-${row.dueDate}-${index}`}>
              <tr className="border-b border-neutral-200">
                <th scope="row" className="p-2 text-left">{/^[1-6]차$/.test(row.installmentType)?`중도금 ${row.installmentType}`:row.installmentType}</th>
                <td className="p-2">{row.dueDate??'—'}</td><td className="p-2">{money(row.scheduledAmount)}</td>
                <td className="p-2">{row.paymentDate??'—'}</td><td className="p-2">{money(row.principalPaid)}</td>
                <td className="p-2">{money(row.actualCashReceived)}</td><td className="p-2">{money(row.lateFee)}</td>
                <td className="p-2">{money(row.discountAmount)}</td><td className="p-2">{statusLabels[row.status]}</td>
              </tr>
              {adjustments.length>0&&<tr className="border-b border-neutral-200"><td colSpan={9} className="p-2 text-neutral-600">
                <span>추가납부·환불 등 별도 내역 (원금과 상계하지 않음): </span>
                {adjustments.map(key=><span className="mr-3 inline-block" key={key}>{adjustmentLabels[key]} <span>{money(row[key])}</span></span>)}
              </td></tr>}
            </Fragment>;
          })}</tbody>
        </table>
      </div>
    </details>
  </section>;
}
