import {
  FUNDING_STATUS_LABELS,
  MOVE_IN_STATUS_LABELS,
  OCCUPANCY_INTENT_LABELS,
} from "@/lib/move-in/labels";
import type { OccupancyRecord } from "@/lib/move-in/queries";

export function OccupancyStatusCards({
  occupancy,
}: {
  occupancy: OccupancyRecord | null;
}) {
  return (
    <section
      className="mt-6 grid gap-3 md:grid-cols-3"
      aria-label="입주 상태 3축"
    >
      <article className="border border-neutral-300 p-4">
        <h2 className="text-sm text-neutral-600">입주의향</h2>
        <p className="mt-2 text-xl font-semibold">
          {occupancy
            ? OCCUPANCY_INTENT_LABELS[occupancy.occupancy_intent]
            : "미등록"}
        </p>
      </article>
      <article className="border border-neutral-300 p-4">
        <h2 className="text-sm text-neutral-600">자금상태</h2>
        <p className="mt-2 text-xl font-semibold">
          {occupancy ? FUNDING_STATUS_LABELS[occupancy.funding_status] : "미등록"}
        </p>
      </article>
      <article className="border border-neutral-300 p-4">
        <h2 className="text-sm text-neutral-600">입주진행</h2>
        <p className="mt-2 text-xl font-semibold">
          {occupancy ? MOVE_IN_STATUS_LABELS[occupancy.move_in_status] : "미등록"}
        </p>
      </article>
    </section>
  );
}
