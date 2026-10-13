export function normalizeHeader(value: string) {
  return value.replace(/\s+/g, "").replace(/[()]/g, "").toLowerCase();
}

export function normalizeBuildingNo(value: string) {
  return value.trim().replace(/동$/u, "").trim();
}

export function normalizeUnitNo(value: string) {
  return value.trim().replace(/호$/u, "").trim();
}

export function normalizePersonName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}
