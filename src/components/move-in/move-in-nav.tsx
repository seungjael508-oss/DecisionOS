"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { MoveInRole } from "@/lib/move-in/access";

const ROLE_LABEL: Record<MoveInRole, string> = {
  COUNSELOR: "상담사",
  PROJECT_ADMIN: "현장 관리자",
  CLIENT_MANAGER: "시행사 관리자",
};

function isActiveItem(pathname: string, item: { href: string; exact: boolean }) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

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
  const router = useRouter();
  // 클릭한 메뉴를 서버 응답 전에 바로 선택 표시한다. 주소가 바뀌면(이동 완료·뒤로가기) 실제 경로 기준으로 돌아간다.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const pendingHref = clicked && clicked.from === pathname ? clicked.href : null;
  const base = `/projects/${projectId}/move-in`;
  // 확정 메뉴 3개만 노출. 나머지 화면(입주 현황·동호배치도·데이터 가져오기·사용자 관리 등)은
  // 라우트·권한을 그대로 두고 메뉴에서만 숨긴다. 동호수 상세는 통합원장 세대 클릭 패널로 제공
  const items = [
    { href: `${base}/ledger`, label: "통합원장", exact: false },
    { href: `${base}/today`, label: "오늘 관리대상", exact: true },
    { href: `${base}/worklog`, label: "업무일지", exact: true },
  ];

  const links = (activeClass: string, idleClass: string) => items.map((item) => {
    const active = pendingHref ? item.href === pendingHref : isActiveItem(pathname, item);
    return (
      <Link
        prefetch={false}
        key={item.href}
        href={item.href}
        onClick={(event) => {
          // 새 탭/창으로 여는 클릭은 현재 화면 이동이 아니므로 선택 표시를 바꾸지 않는다.
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          setClicked({ href: item.href, from: pathname });
        }}
        aria-current={active ? "page" : undefined}
        className={active ? activeClass : idleClass}
      >
        {item.label}
      </Link>
    );
  });

  return (
    <>
      {/* 모바일(1100px 미만): 사이드바 대신 뒤로가기 + 화면 탭만 둔 상단 헤더 */}
      {/* 고정하지 않는다: 세대 상세의 연속 처리 버튼 줄이 상단에 고정되므로 겹치지 않게 함께 스크롤된다 */}
      <header className="border-b border-neutral-300 bg-white print:hidden min-[1100px]:hidden">
        <div className="flex items-center gap-1 px-1">
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={() => (window.history.length > 1 ? router.back() : router.push(`${base}/ledger`))}
            className="flex min-h-11 min-w-11 items-center justify-center text-xl"
          >
            ←
          </button>
          <p className="min-w-0 truncate text-sm font-semibold">{projectName}</p>
          <p className="ml-auto shrink-0 pr-3 text-xs text-neutral-600">{ROLE_LABEL[role]}</p>
        </div>
        <nav className="flex overflow-x-auto" aria-label="입주촉진">
          {links(
            "flex min-h-11 flex-1 shrink-0 items-center justify-center border-b-2 border-neutral-900 px-3 font-semibold whitespace-nowrap",
            "flex min-h-11 flex-1 shrink-0 items-center justify-center border-b-2 border-transparent px-3 whitespace-nowrap text-neutral-600",
          )}
        </nav>
      </header>
      <aside className="hidden w-56 shrink-0 border-r border-neutral-300 p-4 min-[1100px]:block">
        <p className="text-sm font-semibold">{projectName}</p>
        <p className="mt-1 text-sm text-neutral-600">입주촉진 · {ROLE_LABEL[role]}</p>
        <nav className="mt-6 flex flex-col gap-2" aria-label="입주촉진">
          {links("rounded bg-neutral-900 px-2 py-1 text-white", "rounded px-2 py-1 hover:bg-neutral-100")}
        </nav>
      </aside>
    </>
  );
}
