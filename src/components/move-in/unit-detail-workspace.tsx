"use client";

import { createContext, useContext, useState, useImperativeHandle, useEffect, useRef, type Ref, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UnitDetailWorkspaceHandle = { requestNavigation: (href: string) => void; isDirty: () => boolean };

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

  function move(href: string) {
    setPendingHref(null);
    if (onNavigate) {
      // A failed context read must leave both the draft and its dirty guard intact.
      void Promise.resolve(onNavigate(href)).then((moved) => {
        if (moved !== false) setDirty(false);
      });
    } else {
      setDirty(false);
      router.replace(href);
    }
  }

  function requestNavigation(href: string) {
    if(savingRef.current)return;
    if (dirty) {
      setPendingHref(href);
      return;
    }
    move(href);
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
          <button
            type="button"
            disabled={!previousHref || navigationPending || saving}
            onClick={() => previousHref && requestNavigation(previousHref)}
            className="border border-neutral-600 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            이전 세대
          </button>
          <button
            type="button"
            disabled={navigationPending || saving}
            onClick={() => requestNavigation(effectiveNextHref)}
            className="border border-neutral-800 px-3 py-1"
          >
            다음 세대
          </button>
          <button type="button" disabled={saving} onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            닫기
          </button>
          <button type="button" disabled={saving} onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            취소
          </button>
          <button type="button" disabled={saving} onClick={() => requestNavigation(returnTo)} className="border border-neutral-500 px-3 py-1">
            목록으로
          </button>
        </nav>
        {children}
      </div>
      {pendingHref ? (
        <div
          ref={dialogRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.stopPropagation(); setPendingHref(null); }
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
              <button type="button" onClick={() => setPendingHref(null)} className="border border-neutral-500 px-3 py-1">계속 편집</button>
              <button type="button" onClick={() => move(pendingHref)} className="border border-neutral-800 px-3 py-1">저장하지 않고 이동</button>
            </div>
          </div>
        </div>
      ) : null}
    </UnitDetailWorkspaceContext.Provider>
  );
}
