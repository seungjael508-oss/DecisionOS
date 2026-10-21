// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const create = vi.hoisted(() => vi.fn(async (_input: Record<string, unknown>) => ({ ok: false, message: '시험 중단' })));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('@/app/projects/[projectId]/move-in/units/[unitId]/actions', () => ({ createMoveInConsultation: create }));
import { ConsultationCreateForm } from '@/components/move-in/consultation-create-form';
import { buildCreateMoveInConsultationArgs } from '@/lib/move-in/consultation';

afterEach(cleanup);

describe('상담 등록 접촉방법', () => {
  test('전화(CALL)·방문(VISIT)·문자(MESSAGE) 3개, 기본값 전화', () => {
    render(<ConsultationCreateForm projectId="p" unitId="u" customerId="c" expectedContractId="k" />);
    const select = screen.getByLabelText('접촉방법') as HTMLSelectElement;
    expect([...select.options].map(o => [o.value, o.textContent])).toEqual([
      ['OUTBOUND', '전화 (CALL)'], ['VISIT', '방문 (VISIT)'], ['MESSAGE', '문자 (MESSAGE)'],
    ]);
    expect(select.value).toBe('OUTBOUND');
  });

  test('방문 선택 후 저장하면 상담 저장 요청이 VISIT로 간다', async () => {
    render(<ConsultationCreateForm projectId="p" unitId="u" customerId="c" expectedContractId="k" />);
    fireEvent.change(screen.getByLabelText('접촉방법'), { target: { value: 'VISIT' } });
    const form = document.getElementById('consultation-create-form') as HTMLFormElement;
    (form.querySelector('[name="content"]') as HTMLTextAreaElement | HTMLInputElement).value = '현장 방문';
    fireEvent.submit(form);
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ consultationType: 'VISIT', content: '현장 방문' });
  });

  test('VISIT는 18인자 상담 저장 RPC의 p_consultation_type으로 그대로 전달', () => {
    const args = buildCreateMoveInConsultationArgs({ projectId: 'p', unitId: 'u', customerId: 'c', expectedContractId: 'k', consultationType: 'VISIT', content: '방문' });
    expect(args).toMatchObject({ p_consultation_type: 'VISIT', p_expected_contract_id: 'k' });
  });
});
