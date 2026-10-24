"use client";

import { useRef, useState, type ReactNode } from "react";
import "./mobile-detail-tabs.css";

export type MobileDetailTab = "info" | "consult" | "pay";

const TABS: { value: MobileDetailTab; label: string }[] = [
  { value: "info", label: "기본/계약" },
  { value: "consult", label: "상담/방문" },
  { value: "pay", label: "납부/미납" },
];

/**
 * 모바일 세대 상세: 요약 헤더 + 3개 탭으로 스크롤 길이를 줄인다.
 * 자식 섹션에 data-tab="info|consult|pay"를 붙이면 선택 탭만 보인다(CSS로만 숨김: 폼 입력·dirty 상태 유지).
 * 상담 탭에서는 상담 폼의 하단 고정 저장 바가, 다른 탭에서는 상담 탭으로 가는 바가 하단에 고정된다.
 */
export function MobileDetailTabs({ defaultTab = "info", header, children }: {
  defaultTab?: MobileDetailTab;
  header: ReactNode;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<MobileDetailTab>(defaultTab);
  const top = useRef<HTMLDivElement>(null);
  return <>
    <div ref={top} className="min-[1100px]:hidden">{header}</div>
    {/* 상단 연속 처리 줄(UnitDetailWorkspace nav, 높이 61px) 바로 아래에 고정 */}
    <div role="tablist" aria-label="세대 상세 구분" className="sticky top-[61px] z-10 -mx-4 mb-3 grid grid-cols-3 gap-1 border-b border-neutral-200 bg-white px-4 py-2 min-[1100px]:hidden">
      {TABS.map(({ value, label }) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
        className={`min-h-11 rounded-lg text-sm ${tab === value ? "bg-neutral-900 font-semibold text-white" : "bg-neutral-100 text-neutral-600"}`}>{label}</button>)}
    </div>
    <div data-mobile-tab={tab} className="max-[1099px]:flex max-[1099px]:flex-col">{children}</div>
    {tab !== "consult" ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-300 bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] min-[1100px]:hidden">
      <button type="button" onClick={() => { setTab("consult"); top.current?.scrollIntoView({ block: "start" }); }} className="min-h-12 w-full rounded-lg bg-neutral-900 font-semibold text-white">상담·방문 결과 기록하기</button>
    </div> : null}
  </>;
}

/** 모바일 요약 헤더: 동/호수·등급·계약자·전화·D사유·다음접촉을 한 카드에. */
export function MobileUnitHeader({ unitLabel, unitType, customerName, phone, grade, dReasonText, nextContact }: {
  unitLabel: string;
  unitType: string;
  customerName: string;
  phone: ReactNode;
  grade: string | null;
  dReasonText: string | null;
  nextContact: string;
}) {
  return <section aria-label="세대 요약" className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight">{unitLabel}</p>
        <p className="text-xs text-neutral-500">{unitType}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-lg border border-neutral-400 bg-white px-2.5 py-0.5 text-sm font-semibold">{grade ? `${grade}등급` : "등급 미등록"}</span>
        {dReasonText ? <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">D : {dReasonText}</span> : null}
      </div>
    </div>
    <p className="mt-2 font-medium">{customerName}</p>
    <div className="mt-1 text-sm">{phone}</div>
    <p className="mt-2 text-xs text-neutral-600">다음접촉 <span className="font-medium text-neutral-900">{nextContact}</span></p>
  </section>;
}
