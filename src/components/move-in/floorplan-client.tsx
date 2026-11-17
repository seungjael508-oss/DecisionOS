"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { isConfirmedBalancePaid, balancePaidPercent } from '@/lib/move-in/balance-paid';
import { FloorplanBoard } from "@/components/move-in/floorplan-board";
import { listBuildings, type FloorplanColorMode, type FloorplanUnit } from "@/lib/move-in/floorplan";

// All buildings reuse the authorized DTO and share the same floor rows.
export function FloorplanClient({ projectId, units, initialBuildingNo }: {
  projectId: string; units: FloorplanUnit[]; initialBuildingNo: string;
  /** Accepted for old callers; confirmed paid units receive color. */
  initialColorBy?: FloorplanColorMode;
}) {
  const router = useRouter();
  const paid = units.filter(isConfirmedBalancePaid).length;
  const buildings = listBuildings(units);
  const [page, setPage] = useState(() => Math.floor(Math.max(0, buildings.indexOf(initialBuildingNo)) / 4));
  const pages = Math.max(1, Math.ceil(buildings.length / 4));
  const currentPage = Math.min(page, pages - 1);
  const visibleBuildings = buildings.slice(currentPage * 4, currentPage * 4 + 4);
  const visibleUnits = units.filter(unit => visibleBuildings.includes(unit.buildingNo));
  const reserved = units.filter(unit => unit.moveReservation === 'BOOKED').length;
  const [refreshing, startRefresh] = useTransition();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && !refreshing) startRefresh(() => router.refresh()); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.clearInterval(timer); };
  }, [router, refreshing]);
  return <>
    <p className="mb-4 flex flex-wrap items-center gap-3 text-sm">
      <span>전체 {units.length}세대 · 잔금완납 {paid}세대 · 미완납 {units.length - paid}세대 · 이사예약 {reserved}세대 · 완납률 {balancePaidPercent(paid, units.length)}%</span>
      <Link prefetch={false} className="font-medium text-green-800 underline" href={`/projects/${projectId}/move-in/ledger?chapter=balance_paid`}>잔금완납 챕터 보기</Link>
    </p>
    <nav aria-label="동호배치도 페이지" className="mb-4 flex items-center gap-3 text-sm">
      <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="이전 4개 동">이전</button>
      <span role="status">{currentPage + 1} / {pages} · {visibleBuildings.map(building => `${building}동`).join(' · ')}</span>
      <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)} aria-label="다음 4개 동">다음</button>
    </nav>
    <FloorplanBoard projectId={projectId} units={visibleUnits} />
  </>;
}
