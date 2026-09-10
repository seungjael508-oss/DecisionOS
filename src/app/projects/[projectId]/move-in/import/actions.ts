"use server";

import { applyImportRows, analyzeImportFile } from "@/lib/import/apply";
import type { ClassifiedImportRow, ImportApplyDecision } from "@/lib/import/types";

export async function analyzeMoveInImport(projectId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, message: "파일을 선택하세요." };
  }
  return analyzeImportFile(projectId, file);
}

export async function confirmMoveInImport(
  projectId: string,
  rows: ClassifiedImportRow[],
  decisions: ImportApplyDecision[],
) {
  return applyImportRows(projectId, rows, decisions);
}
