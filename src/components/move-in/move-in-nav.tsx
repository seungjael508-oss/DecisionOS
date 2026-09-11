"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MoveInRole } from "@/lib/move-in/access";

const ROLE_LABEL: Record<MoveInRole, string> = {
  COUNSELOR: "상담사",
  PROJECT_ADMIN: "현장 관리자",
};

export function MoveInNav({
  projectId,
  projectName,
  role,
}: {
  projectId: string;
  projectName: string;
  role: MoveInRole;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}/move-in`;
  const items = [
    { href: base, label: "입주 현황", exact: true },
    { href: `${base}/units`, label: "동호수 관리", exact: false },
    { href: `${base}/floorplan`, label: "동호배치도", exact: true },
    { href: `${base}/today`, label: "오늘 관리대상", exact: true },
    { href: `${base}/calls`, label: "상담·콜 관리", exact: true },
    { href: `${base}/deals`, label: "매도·임대 관리", exact: true },
    { href: `${base}/market`, label: "시장동향", exact: true },
    { href: `${base}/worklog`, label: "업무일지", exact: true },
    { href: `${base}/reports`, label: "보고서", exact: true },
    ...(role === "PROJECT_ADMIN"
      ? [
          { href: `${base}/assign`, label: "상담사 배정", exact: true },
          { href: `${base}/brokerages`, label: "중개업소 관리", exact: true },
          { href: `${base}/import`, label: "데이터 가져오기", exact: true },
        ]
      : []),
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-neutral-300 p-4">
      <p className="text-sm font-semibold">{projectName}</p>
      <p className="mt-1 text-sm text-neutral-600">입주촉진 · {ROLE_LABEL[role]}</p>
      <nav className="mt-6 flex flex-col gap-2" aria-label="입주촉진">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded bg-neutral-900 px-2 py-1 text-white"
                  : "rounded px-2 py-1 hover:bg-neutral-100"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
