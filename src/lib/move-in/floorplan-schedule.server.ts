import 'server-only';
import { createServerClient } from '@/lib/supabase/server';
import { readAllRows } from '@/lib/supabase/read-all';
import { resolveConsultationScheduleDates, scheduleBadgeFromDates, type ConsultationScheduleBadge, type ConsultationScheduleMode, type ScheduleContact, type ScheduleIdentity } from '@/lib/move-in/consultation-schedule';

/** Input must be the existing authorized/current-identity snapshot, never request parameters. */
export async function loadFloorplanScheduleBadges(projectId: string, snapshots: readonly ScheduleIdentity[], now = new Date(), mode: ConsultationScheduleMode = "floorplan") {
  const badges = new Map<string, ConsultationScheduleBadge>();
  const dates = new Map<string, NonNullable<ReturnType<typeof resolveConsultationScheduleDates>>>();
  const eligible = snapshots.filter(row => row.projectId === projectId && (mode === 'today' || row.currentGrade === 'A'));
  let queryCount = 0;
  if (!eligible.length) return { badges, dates, error: false, queryCount };
  try {
    const supabase = await createServerClient();
    const unitIds = [...new Set(eligible.map(row => row.unitId))];
    const groups = Array.from({ length: Math.ceil(unitIds.length / 150) }, (_, index) => unitIds.slice(index * 150, (index + 1) * 150));
    const pages = await Promise.all(groups.map(ids => readAllRows<ScheduleContact>((from, to) => {
      queryCount++;
      return supabase.from('consultation').select('project_id,unit_id,customer_id,id,consulted_at,content')
        .eq('project_id', projectId).in('unit_id', ids).lte('consulted_at', now.toISOString())
        .order('consulted_at', { ascending: false }).order('id', { ascending: false })
        .range(from, to).returns<ScheduleContact[]>();
    })));
    // Optional badges fail closed; no partial history may revive an older plan.
    if (pages.some(page => page.error)) return { badges, dates, error: true, queryCount };
    const byUnit = new Map<string, ScheduleContact[]>();
    for (const contact of pages.flatMap(page => page.data)) {
      if (contact.project_id !== projectId) continue;
      const group = byUnit.get(contact.unit_id) ?? []; group.push(contact); byUnit.set(contact.unit_id, group);
    }
    for (const identity of eligible) {
      const confirmed = resolveConsultationScheduleDates(identity, byUnit.get(identity.unitId) ?? [], now, mode);
      if(confirmed) dates.set(identity.unitId,confirmed);
      const badge = scheduleBadgeFromDates(confirmed);
      if (badge) badges.set(identity.unitId, badge);
    }
    return { badges, dates, error: false, queryCount };
  } catch {
    return { badges: new Map<string, ConsultationScheduleBadge>(), dates: new Map<string, NonNullable<ReturnType<typeof resolveConsultationScheduleDates>>>(), error: true, queryCount };
  }
}
