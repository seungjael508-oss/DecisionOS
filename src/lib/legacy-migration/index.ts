export {
  LEGACY_MIGRATION_DB_WRITES,
  LEGACY_PORTAL_READ_ACTIONS,
  LEGACY_PORTAL_WRITE_ACTIONS,
} from "@/lib/legacy-migration/types";
export type {
  LegacyDeal,
  LegacyMigrationPreview,
  LegacyPortalUnit,
  LegacyQualityReport,
  LegacyResale,
  LegacyUnitRecord,
  StayJMigrationCatalog,
} from "@/lib/legacy-migration/types";
export { normalizeLegacyUnits } from "@/lib/legacy-migration/normalize";
export { buildLegacyMigrationPreview } from "@/lib/legacy-migration/preview";
export { buildLegacyQualityReport } from "@/lib/legacy-migration/report";
export { extractOccupancyCandidates } from "@/lib/legacy-migration/occupancy";
export { mapHistoryType } from "@/lib/legacy-migration/map";
export {
  callLegacyPortalRead,
  loginLegacyPortalAdmin,
} from "@/lib/legacy-migration/portal-client";
