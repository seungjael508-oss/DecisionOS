"use client";

import { createContext, useContext, useState, useImperativeHandle, useEffect, useRef, useTransition, type Ref, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UnitDetailWorkspaceHandle = { requestNavigation: (href: string) => void; isDirty: () => boolean };
type NavButton = "previous" | "next" | "close" | "cancel" | "list";
const NAV_ACTIVE_CLASS = "border-black bg-black text-white";

type UnitDetailWorkspaceContextValue = {
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
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
  onNavigate,
  controllerRef,
  navigationPending = false,
}: {
  returnTo: string;
  previousHref: string | null;
  nextHref: string | null;
  lastNextHref?: string;
  children: ReactNode;
  onNavigate?: (href: string) => void | boolean | Promise<void | boolean>;
  controllerRef?: Ref<UnitDetailWorkspaceHandle>;
  navigationPending?: boolean;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef=useRef(false);
  function reportSaving(value:boolean){savingRef.current=value;setSaving(value);}
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<NavButton | null>(null);
  // 상단 이동 버튼 잠금: 연속 클릭이 이전/다음 요청을 겹쳐 다른 세대가 열리는 것을 막는다
  const navigatingRef = useRef(false);
  const mountedRef = useRef(true);
  const [routing, startRouting] = useTransition();
  const routeDoneRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (routing || !routeDoneRef.current) return;
    const done = routeDoneRef.current;
    routeDoneRef.current = null;
    done();
  });

  function releaseNavigation() {
    navigatingRef.current = false;
    if (mountedRef.current) setActiveButton(null);
  }

  function move(href: string): Promise<boolean> {
    setPendingHref(null);
    if (onNavigate) {
      // A failed context read must leave both the draft and its dirty guard intact.
      return Promise.resolve(onNavigate(href)).then((moved) => {
        if (moved !== false) setDirty(false);
        return moved !== false;
      });
    }
    setDirty(false);
    // 라우터 이동이 실제로 끝날 때까지 '이동 중...'을 유지하기 위해 transition 종료를 기다린다
    return new Promise((resolve) => {
      routeDoneRef.current = () => resolve(true);
      startRouting(() => router.replace(href));
    });
  }

  function requestNavigation(href: string) {
    if(savingRef.current)return;
    if (dirty) {
      setPendingHref(href);
      return;
    }
    void move(href);
  }

  function navigateFromButton(button: NavButton, href: string) {
    if (navigatingRef.current || savingRef.current) return;
    navigatingRef.current = true;
    setActiveButton(button);
    // 목록 복귀는 동기 렌더라 바로 실행하면 검은 버튼이 그려지지 않는다. 한 프레임 그린 뒤 이동한다.
    // 백그라운드 탭에서는 requestAnimationFrame이 멈추므로 50ms 타이머와 먼저 오는 쪽으로 진행한다.
    let started = false;
    const start = () => {
      if (started || !mountedRef.current) return;
      started = true;
      if (dirty) {
        setPendingHref(href);
        return;
      }
      move(href).catch(() => false).finally(releaseNavigation);
    };
    requestAnimationFrame(() => setTimeout(start, 0));
    setTimeout(start, 50);
  }

  function cancelPendingNavigation() {
    setPendingHref(null);
    releaseNavigation();
  }

  function navButtonProps(button: NavButton, href: string | null, blocked: boolean, className: string) {
    const active = activeButton === button;
    return {
      type: "button" as const,
      // 진행 중인 버튼은 disabled로 흐려지지 않게 두고, 중복 클릭은 navigatingRef가 막는다
      disabled: active ? false : !href || blocked || activeButton !== null,
      "aria-busy": active || undefined,
      "data-nav-active": active ? "true" : undefined,
      className: `${className} ${active ? NAV_ACTIVE_CLASS : ""}`,
    };
  }

  function navLabel(button: NavButton, label: string) {
    return activeButton === button ? "이동 중..." : label;
  }

  useImperativeHandle(controllerRef, () => ({ requestNavigation, isDirty: () => dirty || savingRef.current }));
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pendingHref) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus({preventScroll:true});
    return () => { if (previous?.isConnected) previous.focus({preventScroll:true}); };
  }, [pendingHref]);

  const context: UnitDetailWorkspaceContextValue = {
    setDirty,
    setSaving: reportSaving,
    requestNavigation,
    navigateAfterSave: move,
  };

  const effectiveNextHref = nextHref ?? lastNextHref ?? returnTo;

  return (
    <UnitDetailWorkspaceContext.Provider value={context}>
      <div>
        <nav aria-label="세대 연속 처리" className="flex flex-wrap gap-2 border-b border-neutral-300 p-4">
          <button {...navButtonProps("previous", previousHref, navigationPending || saving, "border border-neutral-600 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50")} onClick={() => previousHref && navigateFromButton("previous", previousHref)}>
            {navLabel("previous", "이전 세대")}
          </button>
          <button {...navButtonProps("next", effectiveNextHref, navigationPending || saving, "border border-neutral-800 px-3 py-1")} onClick={() => navigateFromButton("next", effectiveNextHref)}>
            {navLabel("next", "다음 세대")}
          </button>
          <button {...navButtonProps("close", returnTo, saving, "border border-neutral-500 px-3 py-1")} onClick={() => navigateFromButton("close", returnTo)}>
            {navLabel("close", "닫기")}
          </button>
          <button {...navButtonProps("cancel", returnTo, saving, "border border-neutral-500 px-3 py-1")} onClick={() => navigateFromButton("cancel", returnTo)}>
            {navLabel("cancel", "취소")}
          </button>
          <button {...navButtonProps("list", returnTo, saving, "border border-neutral-500 px-3 py-1")} onClick={() => navigateFromButton("list", returnTo)}>
            {navLabel("list", "목록으로")}
          </button>
        </nav>
        {children}
      </div>
      {pendingHref ? (
        <div
          ref={dialogRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); cancelPendingNavigation(); }
            if (event.key === "Tab") {
              const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
              const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
              if (event.shiftKey && at <= 0) { event.preventDefault(); buttons.at(-1)?.focus(); }
              else if (!event.shiftKey && at === buttons.length - 1) { event.preventDefault(); buttons[0]?.focus(); }
            }
          }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="unsaved-navigation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div className="w-full max-w-sm border border-neutral-800 bg-white p-5 shadow-lg">
            <p id="unsaved-navigation-title" className="font-semibold">저장하지 않은 변경사항이 있습니다.</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={cancelPendingNavigation} className="border border-neutral-500 px-3 py-1">계속 편집</button>
              <button type="button" onClick={() => { move(pendingHref).catch(() => false).finally(releaseNavigation); }} className="border border-neutral-800 px-3 py-1">저장하지 않고 이동</button>
            </div>
          </div>
        </div>
      ) : null}
    </UnitDetailWorkspaceContext.Provider>
  );
}
