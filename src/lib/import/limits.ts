export const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_ALLOWED_EXTENSIONS = [".xlsx", ".csv"] as const;

export function hasAllowedImportName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsm") || lower.endsWith(".xls")) return false;
  return IMPORT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
