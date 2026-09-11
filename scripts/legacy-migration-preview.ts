import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLegacyMigrationPreview,
  buildLegacyQualityReport,
  normalizeLegacyUnits,
} from "../src/lib/legacy-migration/index.ts";
import type {
  LegacyPortalUnit,
  StayJMigrationCatalog,
} from "../src/lib/legacy-migration/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function main() {
  const rawUnits = await readJson<LegacyPortalUnit[]>(
    join(root, "migration-data", "raw", "units.json"),
    [],
  );
  const counselorMap = await readJson<Record<string, string>>(
    join(root, "migration-data", "counselor-mapping.local.json"),
    {},
  );
  const catalog = await readJson<StayJMigrationCatalog>(
    join(root, "migration-data", "stayj-catalog.local.json"),
    { projectId: "", units: [], customers: [] },
  );

  const records = normalizeLegacyUnits(rawUnits);
  const preview = buildLegacyMigrationPreview({
    records,
    catalog,
    counselorMap,
  });
  const report = buildLegacyQualityReport(preview);

  const normalizedDir = join(root, "migration-data", "normalized");
  const reportsDir = join(root, "migration-data", "reports");
  await mkdir(normalizedDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
  await writeFile(
    join(normalizedDir, "units.json"),
    JSON.stringify(records),
    "utf8",
  );
  await writeFile(
    join(reportsDir, "preview.json"),
    JSON.stringify({
      dbWrites: preview.dbWrites,
      rows: preview.rows.map((row) => ({
        buildingNo: row.buildingNo,
        unitNo: row.unitNo,
        status: row.status,
        reasons: row.reasons,
        writeKind: row.writeKind,
        occupancyCandidates: row.occupancyCandidates,
        consultationCount: row.consultations.length,
        resaleCount: row.resale.length,
        hasDeal: Boolean(row.deal),
      })),
      customerCandidates: preview.customerCandidates.map((item) => ({
        phonePresent: Boolean(item.phoneNormalized),
        unitCount: item.units.length,
      })),
    }),
    "utf8",
  );
  await writeFile(
    join(reportsDir, "quality.json"),
    JSON.stringify(report),
    "utf8",
  );

  process.stdout.write(
    [
      `legacy preview complete dbWrites=${preview.dbWrites}`,
      `units=${report.unitCount}`,
      `customers=${report.uniqueCustomerCount}`,
      `history=${report.consultationCount}`,
      `ready=${report.ready}`,
      `review=${report.reviewRequired}`,
      `error=${report.error}`,
      `unitNotFound=${report.unitNotFoundCount}`,
      `counselorMappingFailure=${report.counselorMappingFailureCount}`,
      `resale=${report.resaleCount}`,
      `deal=${report.dealCount}`,
      `missingPhone=${report.missingPhoneCount}`,
      `multiUnit=${report.multiUnitHolderCount}`,
    ].join(" ") + "\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "preview failed";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
