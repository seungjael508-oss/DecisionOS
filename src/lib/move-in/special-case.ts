export const SPECIAL_CASE_MANUAL_FLAG_MESSAGE =
  "방문 필요·서류·법무·처리상태·메모를 기본값으로 되돌린 후 수동 지정을 해제하세요.";

export const LEGAL_CONSULTATION_STATUS_VALUES = [
  "NOT_REQUIRED",
  "REQUESTED",
  "IN_REVIEW",
  "COMPLETED",
] as const;

export type LegalConsultationStatus = (typeof LEGAL_CONSULTATION_STATUS_VALUES)[number];

export const PROCESSING_STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "COMPLETED",
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUS_VALUES)[number];

export type SpecialCaseMetadata = {
  projectId?: string;
  unitId?: string;
  contractId?: string;
  manuallyFlagged: boolean;
  visitRequired: boolean;
  abandonmentDocumentReceived: boolean;
  terminationDocumentReceived: boolean;
  legalConsultationRequired: boolean;
  legalConsultationStatus: string;
  processingStatus: string;
  memo: string;
};

export type SpecialCaseValidation =
  | { ok: true }
  | { ok: false; code: "manual_consistency" | "invalid_input"; message: string };

export function hasActiveManualMetadata(input: Pick<
  SpecialCaseMetadata,
  | "visitRequired"
  | "abandonmentDocumentReceived"
  | "terminationDocumentReceived"
  | "legalConsultationRequired"
  | "legalConsultationStatus"
  | "processingStatus"
  | "memo"
>) {
  return input.visitRequired ||
    input.abandonmentDocumentReceived ||
    input.terminationDocumentReceived ||
    input.legalConsultationRequired ||
    input.legalConsultationStatus !== "NOT_REQUIRED" ||
    input.processingStatus !== "OPEN" ||
    Boolean(input.memo.trim());
}

export function validateSpecialCaseInput(input: SpecialCaseMetadata): SpecialCaseValidation {
  if (!(LEGAL_CONSULTATION_STATUS_VALUES as readonly string[]).includes(input.legalConsultationStatus)) {
    return { ok: false, code: "invalid_input", message: "법무 협의 상태가 올바르지 않습니다." };
  }
  if (!(PROCESSING_STATUS_VALUES as readonly string[]).includes(input.processingStatus)) {
    return { ok: false, code: "invalid_input", message: "처리상태가 올바르지 않습니다." };
  }
  if (input.memo.length > 2000) {
    return { ok: false, code: "invalid_input", message: "특별관리 메모는 2,000자 이내로 입력하세요." };
  }
  if (!input.manuallyFlagged && hasActiveManualMetadata(input)) {
    return { ok: false, code: "manual_consistency", message: SPECIAL_CASE_MANUAL_FLAG_MESSAGE };
  }
  return { ok: true };
}

export type SpecialCaseRow = {
  project_id: string;
  unit_id: string;
  contract_id: string;
  manually_flagged: boolean;
  visit_required: boolean;
  abandonment_document_received: boolean;
  termination_document_received: boolean;
  legal_consultation_required: boolean;
  legal_consultation_status: string | null;
  processing_status: string | null;
  memo: string | null;
};

export function toSpecialCaseMetadata(row: SpecialCaseRow | null): SpecialCaseMetadata {
  return {
    projectId: row?.project_id,
    unitId: row?.unit_id,
    contractId: row?.contract_id,
    manuallyFlagged: row?.manually_flagged ?? false,
    visitRequired: row?.visit_required ?? false,
    abandonmentDocumentReceived: row?.abandonment_document_received ?? false,
    terminationDocumentReceived: row?.termination_document_received ?? false,
    legalConsultationRequired: row?.legal_consultation_required ?? false,
    legalConsultationStatus: row?.legal_consultation_status ?? "NOT_REQUIRED",
    processingStatus: row?.processing_status ?? "OPEN",
    memo: row?.memo ?? "",
  };
}
