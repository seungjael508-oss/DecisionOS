import ExcelJS from "exceljs";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  hasAllowedImportName,
} from "@/lib/import/limits";
import { columnIndex, mapImportHeaders } from "@/lib/import/map-columns";
import {
  cellText,
  normalizeBuildingNo,
  normalizePersonName,
  normalizePhone,
  normalizeUnitNo,
} from "@/lib/import/normalize";
import type { ImportSourceRow } from "@/lib/import/types";

export type ParsedImportFile =
  | { ok: false; message: string }
  | {
      ok: true;
      mapping: ReturnType<typeof mapImportHeaders>;
      rows: ImportSourceRow[];
    };

const XLSX_MAGIC = [0x50, 0x4b];

export async function parseImportFile(
  fileName: string,
  bytes: Uint8Array,
  mimeType?: string,
): Promise<ParsedImportFile> {
  if (!hasAllowedImportName(fileName)) {
    return { ok: false, message: "xlsx 또는 csv 파일만 업로드할 수 있습니다." };
  }
  const lower = fileName.toLowerCase();
  const mime = mimeType?.toLowerCase() ?? "";
  if (
    mime &&
    mime !== "application/octet-stream" &&
    lower.endsWith(".xlsx") &&
    mime !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    mime !== "application/zip"
  ) {
    return { ok: false, message: "xlsx 또는 csv 파일만 업로드할 수 있습니다." };
  }
  if (
    mime &&
    mime !== "application/octet-stream" &&
    lower.endsWith(".csv") &&
    mime !== "text/csv" &&
    mime !== "text/plain" &&
    mime !== "application/csv"
  ) {
    return { ok: false, message: "xlsx 또는 csv 파일만 업로드할 수 있습니다." };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, message: "빈 파일입니다." };
  }
  if (bytes.byteLength > IMPORT_MAX_FILE_BYTES) {
    return { ok: false, message: "파일 크기가 너무 큽니다." };
  }

  if (lower.endsWith(".xlsx")) {
    if (bytes[0] !== XLSX_MAGIC[0] || bytes[1] !== XLSX_MAGIC[1]) {
      return { ok: false, message: "xlsx 또는 csv 파일만 업로드할 수 있습니다." };
    }
    return parseXlsx(bytes);
  }
  return parseCsv(new TextDecoder("utf-8").decode(bytes));
}

async function parseXlsx(bytes: Uint8Array): Promise<ParsedImportFile> {
  const workbook = new ExcelJS.Workbook();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await workbook.xlsx.load(copy.buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { ok: false, message: "시트가 없습니다." };

  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values.map((cell) => readableCell(cell)));
  });
  return rowsFromMatrix(matrix);
}

function readableCell(value: unknown): unknown {
  if (value && typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) return "";
    if ("text" in value) return (value as { text: string }).text;
  }
  return value;
}

function parseCsv(text: string): ParsedImportFile {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
  const matrix = lines.map(splitCsvLine);
  return rowsFromMatrix(matrix);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function rowsFromMatrix(matrix: unknown[][]): ParsedImportFile {
  if (matrix.length === 0) return { ok: false, message: "헤더가 없습니다." };
  const headers = (matrix[0] ?? []).map((cell) => cellText(cell));
  if (headers.every((header) => header === "")) {
    return { ok: false, message: "헤더가 없습니다." };
  }
  const mapping = mapImportHeaders(headers);
  if (!mapping.buildingNo || !mapping.unitNo || !mapping.holderName) {
    return { ok: false, message: "필수 컬럼 없음" };
  }
  const body = matrix.slice(1);
  if (body.length > IMPORT_MAX_ROWS) {
    return { ok: false, message: "행 수가 너무 많습니다." };
  }

  const rows: ImportSourceRow[] = body.map((line, index) => {
    const get = (field: keyof typeof mapping) => {
      const header = mapping[field];
      const column = columnIndex(headers, header);
      return column >= 0 ? cellText(line[column]) : "";
    };
    const consultation = get("consultation");
    return {
      rowNumber: index + 2,
      buildingNo: normalizeBuildingNo(get("buildingNo")),
      unitNo: normalizeUnitNo(get("unitNo")),
      unitType: get("unitType") || null,
      holderName: normalizePersonName(get("holderName")),
      phoneNormalized: normalizePhone(get("phone")),
      contractDate: get("contractDate") || null,
      overdueText: get("overdue") || null,
      nextStepText: get("nextStep") || null,
      hasConsultationNote: consultation.length > 0,
    };
  });

  return { ok: true, mapping, rows };
}
