"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type UnitDetailWorkspaceContextValue = {
  setDirty: (dirty: boolean) => void;
  requestNavigation: (href: string) => void;
  navigateAfterSave: (href: string) => void;
};

const UnitDetailWorkspaceContext = createContext<UnitDetailWorkspaceContextValue | null>(null);

/**
 * The consultation form reports only its local edit state. Navigation remains
 * centralized here so every app control uses the server-validated return URL.
 */
export function useUnitDetailWorkspace() {
  return useContext(UnitDetailWorkspaceContext);
}

export function UnitDetailWorkspace({
  returnTo,
  previousHref,
  nextHref,
  lastNextHref,
  children,
}: {
  returnTo: string;
  previousHref: string | null;
  nextHref: string | null;
  lastNextHref?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function move(href: string) {
    setDirty(false);
    setPendingHref(null);
    router.replace(href);
  }

  function requestNavigation(href: string) {
    if (dirty) {
      setPendingHref(href);
      return;
    }
    move(href);
  }

  const context: UnitDetailWorkspaceContextValue = {
    setDirty,
    requestNavigation,
    navigateAfterSave: move,
  };

  const effectiveNextHref = nextHref ?? lastNextHref ?? returnTo;

  return (
    <UnitDetailWorkspaceContext.Provider value={context}>
      <div>
        <nav aria-label="세대 연속 처리" className="flex flex-wrap gap-2 border-b border-neutral-300 p-4">
          <button
            type="button"
            disabled={!previousHref}
            onClick={() => previousHref && requestNavigation(previousHref)}
            className="border border-neutral-600 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            이전 세대
          </button>
          <button
            type="button"
            onClick={() => requestNavigation(effectiveNextHref)}
            className="border border-neutral-800 px-3 py-1"
          >
            다음 세대
          </button>
          <button type="button" onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            닫기
          </button>
          <button type="button" onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            취소
          </button>
          <button type="button" onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            목록으로
          </button>
        </nav>
        {children}
      </div>
      {pendingHref ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="unsaved-navigation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div className="w-full max-w-sm border border-neutral-800 bg-white p-5 shadow-lg">
            <p id="unsaved-navigation-title" className="font-semibold">저장하지 않은 변경사항이 있습니다.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setPendingHref(null)} className="border border-neutral-500 px-3 py-1">계속 편집</button>
              <button type="button" onClick={() => move(pendingHref)} className="border border-neutral-800 px-3 py-1">저장하지 않고 이동</button>
            </div>
          </div>
        </div>
      ) : null}
    </UnitDetailWorkspaceContext.Provider>
  );
}
