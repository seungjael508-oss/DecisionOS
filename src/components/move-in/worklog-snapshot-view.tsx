import { CONTACT_TYPE_LABELS, FUNDING_STATUS_LABELS, OCCUPANCY_INTENT_LABELS } from "@/lib/move-in/labels";
import type { MoveInWorklogSnapshot } from "@/lib/worklog/snapshot";
import { WORKLOG_CONTACT_TYPES } from "@/lib/worklog/snapshot";
import type { WorklogActivityCount, WorklogDailySections, WorklogSalesCount } from "@/lib/worklog/snapshot";
import { LEGACY_GRADE_VALUES } from "@/lib/move-in/consultation";
import { MARKET_SCOPE_LABELS } from "@/lib/market/labels";

const numeric = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR");
const percent = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
const cellClass = "border border-neutral-300 px-3 py-2 text-right tabular-nums whitespace-nowrap";
const headingClass = "border border-neutral-300 bg-neutral-100 px-3 py-2 font-medium whitespace-nowrap";
const tableClass = "w-full border-collapse text-sm";

export function WorklogSnapshotView({ snapshot }: { snapshot: MoveInWorklogSnapshot }) {
  if (snapshot.version === 2 && snapshot.salesConsultation && snapshot.managementTargets && snapshot.consultationActivity && snapshot.marketSummary && snapshot.otherActivities) {
    return <DailyWorklogTables snapshot={snapshot as MoveInWorklogSnapshot & WorklogDailySections} />;
  }
  return <LegacyWorklogSnapshotView snapshot={snapshot} />;
}

function SalesCells({ counts }: { counts: WorklogSalesCount }) {
  return <>
    {[counts.supply, counts.sold, counts.unsold].map((n, i) => <td key={i} className={cellClass}>{numeric(n)}</td>)}
    {LEGACY_GRADE_VALUES.map(g => <td key={g} className={cellClass}>{numeric(counts.grades[g])}</td>)}
    {[counts.unclassified, counts.consulted, counts.notConsulted].map((n, i) => <td key={i} className={cellClass}>{numeric(n)}</td>)}
    <td className={cellClass}>{percent(counts.progressPercent)}</td>
  </>;
}

function ActivityCells({ counts }: { counts: WorklogActivityCount }) {
  return <>{[counts.call, counts.visit, counts.other].map((n, i) => <td key={i} className={cellClass}>{numeric(n)}</td>)}</>;
}

function DailyWorklogTables({ snapshot }: { snapshot: MoveInWorklogSnapshot & WorklogDailySections }) {
  const sales = snapshot.salesConsultation, activity = snapshot.consultationActivity, market = snapshot.marketSummary;
  const automatic = snapshot.otherActivities.automatic;
  const activities: Array<[string, number]> = [
    ["부재 재접촉", automatic.absenceRecontacts], ["상담거절 재접촉", automatic.refusalRecontacts],
    ["30일 이상 경과 C/D 재접촉", automatic.staleCDRecontacts], ["방문상담", automatic.visits],
    ["문자상담", automatic.messages], ["금일 상담에 다음접촉 설정", automatic.nextContactSettings],
  ];
  const ratio = (n: number | null, denominator: number) => n === null ? null : denominator ? n / denominator * 100 : 0;
  return <div className="flex flex-col gap-8">
    <section aria-label="1. 분양/상담 현황">
      <h2 className="mb-3 text-lg font-semibold">1. 분양/상담 현황</h2>
      <p className="mb-3 text-sm text-neutral-600"><span>총 대상세대</span> <strong className="tabular-nums">{sales.total.supply}</strong> · 현재 공급 및 유효 계약, 상담등급은 선택일 종료 전 최근 유효 등급 기준</p>
      {sales.total.supply === 0 ? <p className="mb-3 text-sm text-neutral-600">공급 세대 데이터가 없습니다.</p> : null}
      {sales.soldSource === "UNAVAILABLE" ? <p className="mb-3 text-sm text-neutral-600">분양·미분양 자료 연결 대기</p> : null}
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <caption className="sr-only">타입별 분양 및 현재 상담등급</caption>
          <thead><tr>{["타입", "공급", "분양", "미분양", ...LEGACY_GRADE_VALUES, "미분류", "상담진행 계", "상담미진행", "진행률"].map(label => <th key={label} scope="col" className={headingClass}>{label}</th>)}</tr></thead>
          <tbody>{sales.rows.map(row => <tr key={row.unitType}><th scope="row" className={headingClass}>{row.unitType}</th><SalesCells counts={row} /></tr>)}</tbody>
          <tfoot>
            <tr className="font-semibold"><th scope="row" className={headingClass}>계</th><SalesCells counts={sales.total} /></tr>
            <tr><th scope="row" className={headingClass}>비율</th>
              {[sales.total.supply, sales.total.sold, sales.total.unsold].map((n, i) => <td key={i} className={cellClass}>{percent(ratio(n, sales.total.supply))}</td>)}
              {LEGACY_GRADE_VALUES.map(g => <td key={g} className={cellClass}>{percent(sales.gradeRatios[g])}</td>)}
              {[sales.total.unclassified, sales.total.consulted, sales.total.notConsulted].map((n, i) => <td key={i} className={cellClass}>{percent(ratio(n, sales.total.supply))}</td>)}
              <td className={cellClass}>—</td>
            </tr>
            <tr><th scope="row" className={headingClass}>부재 제외시</th><td colSpan={3} className={cellClass}>—</td>
              {LEGACY_GRADE_VALUES.map(g => <td key={g} className={cellClass}>{percent(sales.absenceExcludedRatios[g])}</td>)}
              <td colSpan={4} className={cellClass}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-600">진행률 = 상담진행 ÷ 공급. 등급 비율 = 등급별 세대 ÷ 상담진행. 부재 제외 분모 = 상담진행 − 부재 ({sales.absenceExcludedDenominator}세대). 등급이 없으면 미분류·상담미진행입니다.</p>
      <p className="mt-1 text-xs text-neutral-600">과거 날짜의 공급·계약 상태는 현재 등록 상태를 바탕으로 하며, 이후 해지·명의변경 이전 상태를 복원하지 않습니다.</p>
    </section>
    <section aria-label="2. 관리대상 동호 현황">
      <h2 className="mb-3 text-lg font-semibold">2. 관리대상 동호 현황</h2>
      <p className="border border-neutral-300 p-4 text-sm">관리대상 데이터 연결 대기</p>
      <p className="mt-2 text-xs text-neutral-600">계약금대여·기타연체의 공식 자료가 연결되면 집계할 수 있습니다.</p>
    </section>
    <section aria-label="3. 상담 세부 현황">
      <h2 className="mb-3 text-lg font-semibold">3. 상담 세부 현황</h2>
      {activity.cumulative.total === 0 ? <p className="mb-3 text-sm text-neutral-600">상담 데이터가 없습니다.</p> : null}
      <div className="overflow-x-auto"><table className={tableClass}>
        <caption className="sr-only">목적별 금일상담과 누계</caption>
        <thead><tr><th rowSpan={2} className={headingClass}>상담 목적</th><th colSpan={3} className={headingClass}>금일상담</th><th colSpan={3} className={headingClass}>누계</th></tr>
          <tr>{["전화", "방문", "기타", "전화", "방문", "기타"].map((label, i) => <th key={i} scope="col" className={headingClass}>{label}</th>)}</tr>
        </thead><tbody>{activity.rows.map(row => <tr key={row.purpose}><th scope="row" className={headingClass}>{row.purpose}</th><ActivityCells counts={row.today} /><ActivityCells counts={row.cumulative} /></tr>)}</tbody>
        <tfoot><tr className="font-semibold"><th scope="row" className={headingClass}>계</th><ActivityCells counts={activity.today} /><ActivityCells counts={activity.cumulative} /></tr></tfoot>
      </table></div>
      <p className="mt-2 text-xs text-neutral-600">금일 총 {activity.today.total}건 · 누계 총 {activity.cumulative.total}건. 누계는 선택일 종료 전 전체 상담입니다. 같은 세대의 복수 상담도 각각 집계합니다. MESSAGE·일반상담·미지정 접촉은 기타에 포함합니다.</p>
    </section>
    <section aria-label="4. 매물현황">
      <h2 className="mb-3 text-lg font-semibold">4. 매물현황</h2>
      {market.status === "ERROR" ? <p className="border border-neutral-300 p-4 text-sm">매물현황을 불러오지 못했습니다.</p> : market.rows.length === 0 ? <p className="border border-neutral-300 p-4 text-sm">매물 데이터가 없습니다.</p> : <div className="overflow-x-auto"><table className={tableClass}>
        <caption className="sr-only">단지별 매물과 전일대비</caption>
        <thead><tr><th rowSpan={2} className={headingClass}>단지 / 범위</th><th rowSpan={2} className={headingClass}>수집 기준</th><th colSpan={4} className={headingClass}>금일 기준</th><th colSpan={4} className={headingClass}>전일대비</th></tr>
          <tr>{["매매", "전세", "월세", "계", "매매", "전세", "월세", "계"].map((label, i) => <th key={i} scope="col" className={headingClass}>{label}</th>)}</tr></thead>
        <tbody>{market.rows.map(row => <tr key={row.groupKey}>
          <th scope="row" className={headingClass}>{row.complexName ?? MARKET_SCOPE_LABELS[row.scope]}<span className="block text-xs font-normal text-neutral-600">{MARKET_SCOPE_LABELS[row.scope]}</span></th>
          <td className={cellClass}>{row.collectedAt ? new Intl.DateTimeFormat("ko-KR", { timeZone: snapshot.timeZone, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(row.collectedAt)) : "전체 합계 자료 없음"}{row.carriedForward ? <span className="block text-xs text-neutral-600">이전 수집 자료</span> : null}</td>
          {(["sale", "jeonse", "monthlyRent", "total"] as const).map(k => <td key={k} className={cellClass}>{numeric(row.current[k])}</td>)}
          {(["sale", "jeonse", "monthlyRent", "total"] as const).map(k => <td key={k} className={cellClass}>{row.delta[k] !== null && row.delta[k]! > 0 ? "+" : ""}{numeric(row.delta[k])}</td>)}
        </tr>)}</tbody>
      </table></div>}
      <p className="mt-2 text-xs text-neutral-600">선택일 종료 전 최근 전체합계 자료를 사용합니다. 전일대비는 선택일 시작 전 최근 자료와 비교합니다. 이전 자료가 없거나 금일 수집이 없으면 —로 표시하며 타입별 자료를 중복 합산하지 않습니다.</p>
    </section>
    <section aria-label="5. 기타업무">
      <h2 className="mb-3 text-lg font-semibold">5. 기타업무</h2>
      <h3 className="mb-2 text-sm font-medium">자동집계</h3>
      {activities.some(([, n]) => n > 0) ? <table className={tableClass}><thead><tr><th className={headingClass}>확인된 활동</th><th className={headingClass}>건수</th></tr></thead><tbody>{activities.filter(([, n]) => n > 0).map(([label, n]) => <tr key={label}><th scope="row" className={headingClass}>{label}</th><td className={cellClass}>{n}</td></tr>)}</tbody></table> : <p className="text-sm text-neutral-600">집계할 기타 활동이 없습니다.</p>}
      <p className="mt-2 text-xs text-neutral-600">재접촉은 직전 상담 이력으로 확인한 건수이며 활동 간 중복 가능합니다.</p>
      <h3 className="mt-4 mb-2 text-sm font-medium">수동 메모</h3>
      <p className="border border-neutral-300 p-4 text-sm">수동 메모 저장 연결 대기</p>
    </section>
  </div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="border border-neutral-300 p-4">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function LegacyWorklogSnapshotView({ snapshot }: { snapshot: MoveInWorklogSnapshot }) {
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
