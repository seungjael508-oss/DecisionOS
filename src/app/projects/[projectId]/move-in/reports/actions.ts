"use server";

import { requireMoveInAccess, requireProjectAdmin } from "@/lib/move-in/access";
import { buildGenerateMoveInDailyReportArgs } from "@/lib/move-in/reports";
import { createServerClient } from "@/lib/supabase/server";
import { isWorklogDateYmd } from "@/lib/worklog/day-range";
import { loadMoveInWorklog } from "@/lib/worklog/queries";

export async function generateMoveInDailyReport(input: {
  projectId: string;
  date: string;
}) {
  const access = await requireMoveInAccess(input.projectId);
  if (!requireProjectAdmin(access)) {
    return { ok: false as const };
  }
  if (!isWorklogDateYmd(input.date)) {
    return { ok: false as const };
  }

  const worklog = await loadMoveInWorklog(input.projectId, input.date);
  if (worklog.error) return { ok: false as const };

  const supabase = await createServerClient();
  const { error } = await supabase.rpc(
    "generate_report",
    buildGenerateMoveInDailyReportArgs(input.projectId, worklog.snapshot),
  );
  if (error) return { ok: false as const };
  return { ok: true as const };
}
