import {
  normalizeBuildingNo,
  normalizePhone,
  normalizeUnitNo,
} from "@/lib/import/normalize";
import { mapHistoryType, normalizeCounselorName } from "@/lib/legacy-migration/map";
import type {
  LegacyConsultation,
  LegacyDeal,
  LegacyHistoryRow,
  LegacyPortalUnit,
  LegacyResale,
  LegacyUnitRecord,
} from "@/lib/legacy-migration/types";
import { isLegacyGrade } from "@/lib/move-in/consultation";

function asText(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function parseConsultedAt(value: unknown): string | null {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeConsultation(row: unknown): LegacyConsultation {
  const invalid = !row || typeof row !== "object" || Array.isArray(row);
  const history = invalid ? {} : (row as LegacyHistoryRow);
  const content = asText(history.content) ?? "";
  const consultedAt = parseConsultedAt(history.date);
  const rawEvaluation = asText(history.evaluation);
  const rawType = asText(history.type);
  const mapped = mapHistoryType(rawType);
  const structuredTags: LegacyConsultation["structuredTags"] = {
    legacy_source: "old_crm",
  };
  if (rawEvaluation && isLegacyGrade(rawEvaluation)) {
    structuredTags.legacy_grade = rawEvaluation;
  } else if (rawEvaluation) {
    structuredTags.legacy_grade_raw = rawEvaluation;
  }

  return {
    consultedAt,
    counselorName: normalizeCounselorName(asText(history.counselor)),
    rawType,
    contactType: mapped.contactType,
    purpose: mapped.purpose,
    content,
    rawEvaluation,
    structuredTags,
    invalid: invalid || !consultedAt,
  };
}

function normalizeResale(row: unknown): LegacyResale {
  if (!row || typeof row !== "object" || Array.isArray(row)) return {};
  const item = row as LegacyResale;
  return {
    date: asText(item.date) ?? item.date,
    seller: asText(item.seller) ?? item.seller,
    buyer: asText(item.buyer) ?? item.buyer,
    reason: asText(item.reason) ?? item.reason,
  };
}

function normalizeDeal(value: unknown): LegacyDeal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return { ...(value as LegacyDeal) };
}

export function normalizeLegacyUnits(units: LegacyPortalUnit[]): LegacyUnitRecord[] {
  return units.map((unit) => {
    const phoneRaw = asText(unit.phone);
    return {
      buildingNo: normalizeBuildingNo(asText(unit.dong) ?? ""),
      unitNo: normalizeUnitNo(asText(unit.ho) ?? ""),
      unitType: asText(unit.areaSupply),
      customerName: asText(unit.name) ?? "",
      phoneRaw,
      phoneNormalized: normalizePhone(phoneRaw),
      address1: asText(unit.address1),
      address2: asText(unit.address2),
      counselorName: normalizeCounselorName(asText(unit.counselor)),
      legacyGrade: asText(unit.evaluation),
      contractType: asText(unit.contractType),
      overdueAmount: asNumber(unit.overdue),
      dueAmount: asNumber(unit.dueAmount),
      paidAmount: asNumber(unit.paidAmount),
      balancePaidRaw: asText(unit.balancePaid),
      balancePaidAt: null,
      legacySummary: asText(unit.summary),
      consultations: asArray<unknown>(unit.history).map(normalizeConsultation),
      resale: asArray<unknown>(unit.resale).map(normalizeResale),
      deal: normalizeDeal(unit.deal),
    };
  });
}
