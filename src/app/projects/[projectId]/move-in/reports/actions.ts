"use server";

import { canManageField } from "@/lib/move-in/field-access";

import { requireMoveInAccess } from "@/lib/move-in/access";
import { buildGenerateMoveInDailyReportArgs } from "@/lib/move-in/reports";
import { createServerClient } from "@/lib/supabase/server";
import { isWorklogDateYmd } from "@/lib/worklog/day-range";
import { loadMoveInWorklog } from "@/lib/worklog/queries";
import { worklogSnapshotFingerprint } from "@/lib/worklog/fingerprint";

export async function generateMoveInDailyReport(input: {
  projectId: string;
  date: string;
  expectedFingerprint?: string;
}) {
  const access = await requireMoveInAccess(input.projectId);
  if (!access.ok || !canManageField(input.projectId, access.role)) {
    return { ok: false as const };
  }
  if (!isWorklogDateYmd(input.date)) {
    return { ok: false as const };
  }

  try {
    const worklog = await loadMoveInWorklog(input.projectId, input.date);
    if (worklog.error) return { ok: false as const };
    if (input.expectedFingerprint !== undefined &&
        input.expectedFingerprint !== worklogSnapshotFingerprint(worklog.snapshot)) {
      return { ok: false as const, reason: "STALE_SNAPSHOT" as const };
    }

    const supabase = await createServerClient();
    const { error } = await supabase.rpc(
      "generate_report",
      buildGenerateMoveInDailyReportArgs(input.projectId, worklog.snapshot),
    );
    if (error) return { ok: false as const };
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
