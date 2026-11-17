# Scoped production release

Goal: Release only paid-date display, paid green floorplan, worklog payment-by-type, and Asel display. Exclude incomplete holder-transfer changes.

Use existing isolated checkout tmp/release-balance-ui at 8773a727e8c07e3c4ffc6745744c483e657f424d. Copy an explicit file allowlist, retaining baseline holder-transfer/server behavior. For the mixed standalone detail page apply the Asel display hunk alone. Preserve existing approved private source projections locally without printing data. Do not change production database/schema.

- [ ] Prepare candidate and inventory exact changes and exclusions.
- [ ] Pass TypeScript, changed-file ESLint, regression tests, production build.
- [ ] Test paid-state concurrency using independent sessions on isolated local PostgreSQL with the existing production RPC definitions; no production writes.
- [ ] Read current production unit/paid counts and capture current deployment/domain target.
- [ ] Review candidate for Critical/High risks.
- [ ] Stage Vercel production with --skip-domain, inspect build and candidate.
- [ ] Verify authenticated administrator flow, paid display, floorplan, worklog, Asel badges in staged deployment.
- [ ] Promote only after all gates pass; otherwise preserve existing domain deployment.
- [ ] Verify live responses/error logs and report deployment ID and switch time, or precise failed gate.

An unavailable authenticated browser session is a release gate, not a passing UI check. Never disable auth/protection or change production test data to get through verification.
