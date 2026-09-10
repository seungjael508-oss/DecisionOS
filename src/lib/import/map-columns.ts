import { normalizeHeader } from "@/lib/import/normalize";

export type MappedField =
  | "buildingNo"
  | "unitNo"
  | "unitType"
  | "holderName"
  | "phone"
  | "contractDate"
  | "consultation"
  | "overdue"
  | "nextStep";

const HEADER_ALIASES: Record<MappedField, string[]> = {
  buildingNo: ["동", "동수", "building", "buildingno", "동번호"],
  unitNo: ["호수", "호", "unit", "unitno", "세대호수"],
  unitType: ["공급형", "타입", "주택형", "unittype", "형"],
  holderName: ["계약자", "성명", "이름", "계약자명", "수분양자"],
  phone: ["전화", "전화번호", "휴대폰", "연락처", "핸드폰", "phone"],
  contractDate: ["계약일", "계약일자", "contractdate"],
  consultation: ["상담내용", "상담", "메모"],
  overdue: ["연체구분", "연체", "자금"],
  nextStep: ["향후진행", "진행", "향후"],
};

export function mapImportHeaders(headers: string[]) {
  const mapping: Record<MappedField, string | null> = {
    buildingNo: null,
    unitNo: null,
    unitType: null,
    holderName: null,
    phone: null,
    contractDate: null,
    consultation: null,
    overdue: null,
    nextStep: null,
  };
  const used = new Set<number>();
  for (const field of Object.keys(HEADER_ALIASES) as MappedField[]) {
    const aliases = HEADER_ALIASES[field].map(normalizeHeader);
    const index = headers.findIndex((header, headerIndex) => {
      if (used.has(headerIndex)) return false;
      const normalized = normalizeHeader(header);
      return aliases.some(
        (alias) => normalized === alias || normalized.includes(alias),
      );
    });
    if (index >= 0) {
      mapping[field] = headers[index] ?? null;
      used.add(index);
    }
  }
  return mapping;
}

export function columnIndex(headers: string[], header: string | null) {
  if (!header) return -1;
  return headers.findIndex((item) => item === header);
}
