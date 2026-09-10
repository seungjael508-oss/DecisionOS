import { CONTACT_TYPE_LABELS, FUNDING_STATUS_LABELS, OCCUPANCY_INTENT_LABELS } from "@/lib/move-in/labels";
import type { MoveInWorklogSnapshot } from "@/lib/worklog/snapshot";
import { WORKLOG_CONTACT_TYPES } from "@/lib/worklog/snapshot";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="border border-neutral-300 p-4">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

export function WorklogSnapshotView({ snapshot }: { snapshot: MoveInWorklogSnapshot }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-label="세대 입주">
        <h2 className="mb-3 text-lg font-semibold">세대/입주</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="총 대상세대" value={snapshot.summary.totalUnits} />
          <Stat label="잔금완납" value={snapshot.summary.balancePaid} />
          <Stat label="금일 잔금완납" value={snapshot.summary.balancePaidToday} />
          <Stat label="입주완료" value={snapshot.summary.movedIn} />
          <Stat label="금일 입주" value={snapshot.summary.movedInToday} />
          <Stat label="입주예정" value={snapshot.summary.planned} />
          <Stat label="미입주" value={snapshot.summary.notMovedIn} />
        </div>
      </section>

      <section aria-label="계약자 상태">
        <h2 className="mb-3 text-lg font-semibold">계약자 상태</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={OCCUPANCY_INTENT_LABELS.SELF_MOVE_IN} value={snapshot.intent.selfMoveIn} />
          <Stat label={OCCUPANCY_INTENT_LABELS.SALE} value={snapshot.intent.sale} />
          <Stat label={OCCUPANCY_INTENT_LABELS.JEONSE} value={snapshot.intent.jeonse} />
          <Stat label={OCCUPANCY_INTENT_LABELS.MONTHLY_RENT} value={snapshot.intent.monthlyRent} />
          <Stat label={OCCUPANCY_INTENT_LABELS.UNDECIDED} value={snapshot.intent.undecided} />
          <Stat label={FUNDING_STATUS_LABELS.FUNDING_SHORTAGE} value={snapshot.funding.fundingShortage} />
          <Stat
            label={FUNDING_STATUS_LABELS.EXISTING_HOME_UNSOLD}
            value={snapshot.funding.existingHomeUnsold}
          />
          <Stat label="미접촉" value={snapshot.contact.notContacted} />
        </div>
      </section>

      <section aria-label="접촉">
        <h2 className="mb-3 text-lg font-semibold">접촉</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="금일 상담/접촉" value={snapshot.consultations.totalToday} />
          <Stat label="다음 접촉 예정" value={snapshot.consultations.nextContactDue} />
          {WORKLOG_CONTACT_TYPES.map((type) => (
            <Stat
              key={type}
              label={CONTACT_TYPE_LABELS[type] ?? type}
              value={snapshot.consultations.byType[type]}
            />
          ))}
        </div>
      </section>

      <section aria-label="동별 현황">
        <h2 className="mb-3 text-lg font-semibold">동별 현황</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-400 text-left">
              <th className="py-2">동</th>
              <th className="py-2 text-right">총세대</th>
              <th className="py-2 text-right">잔금완납</th>
              <th className="py-2 text-right">입주완료</th>
              <th className="py-2 text-right">입주예정</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.byBuilding.map((row) => (
              <tr key={row.buildingNo} className="border-b border-neutral-200">
                <td className="py-2">{row.buildingNo}</td>
                <td className="py-2 text-right tabular-nums">{row.totalUnits}</td>
                <td className="py-2 text-right tabular-nums">{row.balancePaid}</td>
                <td className="py-2 text-right tabular-nums">{row.movedIn}</td>
                <td className="py-2 text-right tabular-nums">{row.planned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="타입별 현황">
        <h2 className="mb-3 text-lg font-semibold">타입별 현황</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-400 text-left">
              <th className="py-2">타입</th>
              <th className="py-2 text-right">총세대</th>
              <th className="py-2 text-right">잔금완납</th>
              <th className="py-2 text-right">입주완료</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.byUnitType.map((row) => (
              <tr key={row.unitType} className="border-b border-neutral-200">
                <td className="py-2">{row.unitType}</td>
                <td className="py-2 text-right tabular-nums">{row.totalUnits}</td>
                <td className="py-2 text-right tabular-nums">{row.balancePaid}</td>
                <td className="py-2 text-right tabular-nums">{row.movedIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
