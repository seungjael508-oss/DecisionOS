// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import { UnitDetailWorkspace, useUnitDetailWorkspace } from '@/components/move-in/unit-detail-workspace';

// 필터·정렬이 들어간 목록 URL: 이동 후에도 그대로 전달되어야 한다
const RETURN_TO = '/projects/p1/move-in/ledger?grade=C&sort=phone&dir=desc&q=101';

function deferred() {
  let resolve!: (moved: boolean) => void;
  const promise = new Promise<boolean>((r) => { resolve = r; });
  return { promise, resolve };
}

function DirtyForm() {
  const workspace = useUnitDetailWorkspace();
  useEffect(() => { workspace?.setDirty(true); }, [workspace]);
  return null;
}

function renderWorkspace(onNavigate: (href: string) => Promise<boolean>, dirty = false) {
  return render(
    <UnitDetailWorkspace returnTo={RETURN_TO} previousHref={`${RETURN_TO}#previous`} nextHref={`${RETURN_TO}#next`} onNavigate={onNavigate}>
      {dirty ? <DirtyForm /> : null}
    </UnitDetailWorkspace>,
  );
}
const button = (name: string) => screen.getByRole('button', { name });

afterEach(cleanup);

describe('세대 상세 상단 이동 버튼', () => {
  test('클릭 즉시 검은 배경·흰 글씨와 이동 중... 표시', () => {
    const pending = deferred();
    renderWorkspace(() => pending.promise);
    fireEvent.click(button('다음 세대'));
    const active = button('이동 중...');
    expect(active.className).toContain('bg-black');
    expect(active.className).toContain('text-white');
    expect(active.getAttribute('aria-busy')).toBe('true');
  });

  test('같은 버튼 반복 클릭은 이동 요청 1회', async () => {
    const pending = deferred();
    const onNavigate = vi.fn(() => pending.promise);
    renderWorkspace(onNavigate);
    const next = button('다음 세대');
    for (let i = 0; i < 5; i++) fireEvent.click(next);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    for (let i = 0; i < 5; i++) fireEvent.click(button('이동 중...'));
    await new Promise((r) => setTimeout(r, 50));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(`${RETURN_TO}#next`);
  });

  test('다음→이전 연속 클릭: 먼저 누른 다음 세대만 진행, 나머지 버튼 잠금', async () => {
    const pending = deferred();
    const onNavigate = vi.fn(() => pending.promise);
    renderWorkspace(onNavigate);
    fireEvent.click(button('다음 세대'));
    fireEvent.click(button('이전 세대'));
    fireEvent.click(button('목록으로'));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith(`${RETURN_TO}#next`);
    expect((button('이전 세대') as HTMLButtonElement).disabled).toBe(true);
    expect((button('목록으로') as HTMLButtonElement).disabled).toBe(true);
  });

  test('이동 실패 시 선택·로딩 상태 해제 후 다시 이동 가능', async () => {
    const first = deferred();
    const onNavigate = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(true);
    renderWorkspace(onNavigate);
    fireEvent.click(button('이전 세대'));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    await act(async () => { first.resolve(false); });
    const previous = button('이전 세대') as HTMLButtonElement;
    expect(previous.className).not.toContain('bg-black');
    expect(previous.disabled).toBe(false);
    expect(screen.queryByText('이동 중...')).toBeNull();
    fireEvent.click(previous);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(2));
  });

  test('이동 요청 예외에서도 상태 해제', async () => {
    const onNavigate = vi.fn().mockRejectedValueOnce(new Error('network'));
    renderWorkspace(onNavigate);
    fireEvent.click(button('다음 세대'));
    await waitFor(() => expect(screen.queryByText('이동 중...')).toBeNull());
    expect((button('목록으로') as HTMLButtonElement).disabled).toBe(false);
  });

  test('목록·닫기·취소는 필터·정렬이 담긴 목록 URL을 그대로 전달', async () => {
    for (const name of ['목록으로', '닫기', '취소']) {
      const onNavigate = vi.fn().mockResolvedValue(true);
      renderWorkspace(onNavigate);
      fireEvent.click(button(name));
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(RETURN_TO));
      cleanup();
    }
  });

  test('requestAnimationFrame이 멈춘 백그라운드 탭에서도 이동 요청 1회 진행', async () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    try {
      const onNavigate = vi.fn().mockResolvedValue(true);
      renderWorkspace(onNavigate);
      fireEvent.click(button('다음 세대'));
      await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
      await new Promise((r) => setTimeout(r, 100));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    } finally { raf.mockRestore(); }
  });

  test('미저장 확인창에서 계속 편집하면 버튼 상태 해제, 이동 요청 없음', async () => {
    const onNavigate = vi.fn().mockResolvedValue(true);
    renderWorkspace(onNavigate, true);
    fireEvent.click(button('다음 세대'));
    const keep = await screen.findByRole('button', { name: '계속 편집' });
    expect(screen.getByText('이동 중...')).toBeTruthy();
    fireEvent.click(keep);
    expect(screen.queryByText('이동 중...')).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
