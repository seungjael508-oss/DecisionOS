import { createHash } from "node:crypto";
import { worklogGeneratedData, type MoveInWorklogSnapshot } from "./snapshot";

/** Compare server-built aggregate snapshots without accepting client report data. */
export function worklogSnapshotFingerprint(snapshot: MoveInWorklogSnapshot): string {
  return createHash("sha256")
    .update(JSON.stringify(worklogGeneratedData(snapshot)))
    .digest("hex");
}
