import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { buildTodayTaskArgs, todayTaskOutcome, type TodayTaskOutcome } from '@/lib/move-in/today-task';

type RpcClient = { rpc: (name: string, args: object) => Promise<{ data: unknown; error: unknown }> };

export type TodayHandledRow = { unitId: string; action: 'COMPLETE' | 'SNOOZE'; snoozedUntil: string | null; handledAt: string };

/** 오늘(KST) 처리한 세대(완료·다음 관리일 미룸). 처리 기록을 읽기만 한다(같은 세션 RLS). 실패하면 error. */
export async function loadTodayHandled(projectId: string, now = new Date()): Promise<{ error: boolean; rows: TodayHandledRow[] }> {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  try {
    const supabase = (await createServerClient()) as unknown as {
      from: (table: 'move_in_tracking_disposition') => { select: (columns: string) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: { unit_id: string; action: string; snoozed_until: string | null; updated_at: string }[] | null; error: unknown }> } } } };
    };
    const { data, error } = await supabase.from('move_in_tracking_disposition').select('unit_id,action,snoozed_until,updated_at')
      .eq('project_id', projectId).eq('tracking_date', today).order('updated_at', { ascending: false });
    if (error || !data) return { error: true, rows: [] };
    // 같은 세대에 기록이 여러 개(상태가 바뀐 뒤 다시 처리)면 가장 최근 것만
    const seen = new Set<string>();
    const rows: TodayHandledRow[] = [];
    for (const row of data) {
      if (seen.has(row.unit_id) || (row.action !== 'COMPLETE' && row.action !== 'SNOOZE')) continue;
      seen.add(row.unit_id);
      rows.push({ unitId: row.unit_id, action: row.action, snoozedUntil: row.snoozed_until, handledAt: row.updated_at });
    }
    return { error: false, rows };
  } catch {
    return { error: true, rows: [] };
  }
}

/** 저장 성공이 확인된 뒤에만 호출한다. RPC가 ACTIVE 계약·현장 쓰기 권한을 다시 확인하고, 같은 날 재호출은 기록을 갱신한다. */
export async function completeTodayTask(projectId: string, unitId: string, nextAt: string | null | undefined): Promise<TodayTaskOutcome> {
  const args = buildTodayTaskArgs(projectId, unitId, nextAt);
  try {
    const supabase = (await createServerClient()) as unknown as RpcClient;
    return todayTaskOutcome(args, await supabase.rpc('complete_or_snooze_move_in_tracking', args));
  } catch {
    return 'failed';
  }
}
