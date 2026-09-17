import Link from "next/link";
import type { loadDashboard } from "@/lib/move-in/queries";

type DashboardData = Extract<Awaited<ReturnType<typeof loadDashboard>>, {error:false}>["data"];

export function DashboardSummary({data,projectName,projectId}:{data:DashboardData;projectName:string;projectId:string}) {
  const {initial,activity,occupancy}=data;
  return <main className="p-8">
    <header className="mb-8">
      <h1 className="text-3xl font-semibold">{projectName}</h1>
      <p className="mt-2 text-neutral-600">입주촉진 · {data.date} (Asia/Seoul)</p>
    </header>
    <section aria-label="Legacy 초기 현황">
      <h2 className="mb-3 text-xl font-semibold">Legacy 초기 현황</h2>
      {initial ? <>
        <Numbers items={[["총 대상세대",initial.total],...Object.entries(initial.grades)]}/>
        <p className="mt-3 text-sm text-neutral-600">Excel 종합 최근평가 · 이관 초기 snapshot · 합계 {Object.values(initial.grades).reduce((a,b)=>a+b,0)}세대</p>
        <p className="text-sm text-neutral-600">원장 상태 기준시각 미확정. 과거 날짜의 현황이나 오늘 상담 후 등급으로 소급·대체하지 않습니다.</p>
        {data.totalUnits!==initial.total && <p role="status">현재 조회 대상 {data.totalUnits}세대 · 초기 원장과 대상 수 확인 필요</p>}
      </> : <p>담당 대상 {data.totalUnits}세대 · 프로젝트 전체 초기 snapshot은 관리자 조회 범위입니다.</p>}
    </section>
    <section aria-label="상담현황" className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">상담현황</h2>
      <p>과거 상담이력 연결 {data.legacyLinked}세대</p>
      <p>원천 연결 확인 필요 {data.sourceReview}세대</p>
      <p className="text-sm text-neutral-600">연결 확인 대상은 실제 미접촉을 의미하지 않습니다.</p>
      <p className="mt-2">오늘 접촉 {activity.total}건 / {activity.units}세대</p>
      <p>다음접촉 예정 {data.nextScheduled}세대</p>
      <p className="text-sm text-neutral-600">다음접촉 예정: 현재 시각 이후로 등록된 일정</p>
      <Link className="mt-3 inline-block underline" href={`/projects/${projectId}/move-in/units`}>동호수 관리 · 상담이력</Link>
    </section>
    <section aria-label="오늘 운영 활동" className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">오늘 운영 활동</h2>
      <Numbers items={[["오늘 총 상담",activity.total],["전화 CALL",activity.channels.CALL],["방문 VISIT",activity.channels.VISIT],["문자 MESSAGE",activity.channels.MESSAGE],["채널 미확인",activity.channels.UNKNOWN],["상담 직전 C 접촉",activity.previousC],["상담 직전 D 접촉",activity.previousD],["부재 재접촉",activity.absentRecontact],["다음접촉 등록",activity.nextRegistered]]}/>
      <p className="mt-3 text-sm text-neutral-600">DecisionOS 상담 event 기준 · consulted_at 한국시간 · 동일 세대 반복 상담은 각각 1건</p>
      <h3 className="mt-4 font-semibold">등급변경 {Object.values(activity.changes).reduce((a,b)=>a+b,0)}건</h3>
      <ul>{Object.entries(activity.changes).map(([change,count])=><li key={change}>{change} · {count}건</li>)}</ul>
      <p className="text-sm text-neutral-600">같은 세대·계약자의 상담 직전 유효 평가 → 이번 상담 결과</p>
      {activity.previousUnknown>0 && <p>직전 평가 확인 필요 {activity.previousUnknown}건</p>}
    </section>
    <details className="mt-8 border-t border-neutral-300 pt-4">
      <summary className="cursor-pointer font-semibold">입주상태 보조정보</summary>
      <p className="my-3 text-sm text-neutral-600">입주상태 입력값이며, Legacy 상담 유무와 별개입니다.</p>
      <Numbers items={[["잔금완납",occupancy.balancePaid],["입주완료",occupancy.movedIn],["입주예정",occupancy.planned],["자금문제",occupancy.fundingIssue],["매도/임대",occupancy.sellOrRent],["입주의향 미설정",occupancy.undecided],["입주진행 미설정",occupancy.notContacted]]}/>
    </details>
    <nav className="mt-8 flex gap-5" aria-label="현장 업무">
      <Link className="underline" href={`/projects/${projectId}/move-in/today`}>오늘 관리대상</Link>
      <Link className="underline" href={`/projects/${projectId}/move-in/worklog`}>업무일지</Link>
    </nav>
  </main>;
}

function Numbers({items}:{items:Array<[string,number]>}) {
  return <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(([label,value])=><div key={label} className="border border-neutral-300 p-4">
    <dt className="text-sm text-neutral-600">{label}</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
  </div>)}</dl>;
}
