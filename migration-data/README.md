# P0-3 legacy portal migration (local files only)

This folder holds one-off export/preview artifacts. Raw portal JSON contains
phone numbers, addresses, and consultation text. Do not commit it.

```
migration-data/
  raw/            # gitignored original API responses
  normalized/     # gitignored staging rows
  reports/        # gitignored aggregate preview
  counselor-mapping.example.json
```

## Export (read-only)

Requires a current **관리자** portal login. Never uses `getMyUnits`.

```bash
LEGACY_PORTAL_NAME='관리자이름' \
LEGACY_PORTAL_PASSWORD='...' \
npm run legacy:export
```

Allowed APIs: `checkPassword`, `getAllUnits`, `getCounselors`,
`getConsultTypes`, `getEvaluationOptions`, `getRealtyList`,
`getPrugioListingsAll`, `getSummaryData`.

## Preview (no database writes)

```bash
cp migration-data/counselor-mapping.example.json \
  migration-data/counselor-mapping.local.json
# fill local mapping: {"상담사이름": "project_member-uuid"}
npm run legacy:preview
```

Optional Stay J unit catalog: `migration-data/stayj-catalog.local.json`.
Missing catalog rows become `UNIT_NOT_FOUND`. This step does not INSERT
into Supabase.
