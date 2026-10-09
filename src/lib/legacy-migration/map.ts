export function mapHistoryType(rawType: string | null): {
  contactType: string;
  purpose: string;
} {
  const value = (rawType ?? "").trim();
  if (!value) {
    return { contactType: "CONSULTATION", purpose: "CONSULTATION" };
  }
  if (/아웃바운드|아웃콜/.test(value)) {
    return { contactType: "CALL", purpose: "OUTBOUND" };
  }
  if (/인바운드/.test(value)) {
    return { contactType: "CALL", purpose: "INBOUND" };
  }
  if (/방문|대면/.test(value)) {
    return { contactType: "VISIT", purpose: "VISIT" };
  }
  if (/문자|메시지|메세지/.test(value)) {
    return { contactType: "MESSAGE", purpose: "MESSAGE" };
  }
  return { contactType: "CONSULTATION", purpose: value };
}

export function normalizeCounselorName(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = String(value).normalize("NFC").trim().replace(/\s+/g, " ");
  return normalized || null;
}

export function lookupCounselorId(
  name: string | null,
  counselorMap: Record<string, string>,
) {
  const key = normalizeCounselorName(name);
  if (!key) return { id: null, missing: false };
  const mapped = counselorMap[key] ?? null;
  return { id: mapped, missing: !mapped };
}
