import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  callLegacyPortalRead,
  loginLegacyPortalAdmin,
} from "../src/lib/legacy-migration/portal-client.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "migration-data", "raw");

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the one-off exporter`);
  }
  return value;
}

async function writeRaw(name: string, data: unknown) {
  await writeFile(join(rawDir, name), JSON.stringify(data), "utf8");
}

async function main() {
  const name = requireEnv("LEGACY_PORTAL_NAME");
  const password = requireEnv("LEGACY_PORTAL_PASSWORD");
  const session = await loginLegacyPortalAdmin({ name, password });
  const token = session.token;
  const requesterName = name;

  const [units, counselors, realty, consultTypes, evaluations, prugio, summary] =
    await Promise.all([
      callLegacyPortalRead<unknown[]>("getAllUnits", { token, requesterName }),
      callLegacyPortalRead<unknown[]>("getCounselors", { token }),
      callLegacyPortalRead<unknown[]>("getRealtyList", { token }),
      callLegacyPortalRead<unknown[]>("getConsultTypes", { token }),
      callLegacyPortalRead<unknown[]>("getEvaluationOptions", { token }),
      callLegacyPortalRead<unknown[]>("getPrugioListingsAll", {
        token,
        requesterName,
      }),
      callLegacyPortalRead<unknown>("getSummaryData", { token, requesterName }),
    ]);

  await mkdir(rawDir, { recursive: true });
  await writeRaw("units.json", units);
  await writeRaw("counselors.json", counselors);
  await writeRaw("realty.json", realty);
  await writeRaw("consult-types.json", consultTypes);
  await writeRaw("evaluation-options.json", evaluations);
  await writeRaw("prugio-listings.json", prugio);
  await writeRaw("summary-data.json", summary);

  const unitCount = Array.isArray(units) ? units.length : 0;
  process.stdout.write(
    `legacy export complete: units=${unitCount} counselors=${Array.isArray(counselors) ? counselors.length : 0} realty=${Array.isArray(realty) ? realty.length : 0} dbWrites=0\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "export failed";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
