"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MoveInRole } from "@/lib/move-in/access";

const ROLE_LABEL: Record<MoveInRole, string> = {
  COUNSELOR: "상담사",
  PROJECT_ADMIN: "현장 관리자",
  CLIENT_MANAGER: "시행사 관리자",
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
  // 확정 메뉴 3개만 노출. 나머지 화면(입주 현황·동호배치도·데이터 가져오기·사용자 관리 등)은
  // 라우트·권한을 그대로 두고 메뉴에서만 숨긴다. 동호수 상세는 통합원장 세대 클릭 패널로 제공
  const items = [
    { href: `${base}/ledger`, label: "통합원장", exact: false },
    { href: `${base}/today`, label: "오늘 관리대상", exact: true },
    { href: `${base}/worklog`, label: "업무일지", exact: true },
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
