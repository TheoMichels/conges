# Test contract — immutable AC-01..04
| AC | Evidence | Command |
|---|---|---|
| 01 | strict parsing/schema; editing, invalid/empty edits, per-year defaults | `npm test`; feature E2E |
| 02 | weekends/coincidences, 100% regression, decimal budgets/remaining/carry-over; visible totals | same |
| 03 | repository legacy/roundtrip; cloud pull/insert/conflict-update; PGlite additive migration | `npm test`; E2E reload |
| 04 | French accessible control, original/adjusted detail, 375px layout and reasons | `e2e/work-percentage.spec.ts`; independent browser QA |
Full final harness (storage transverse): `verify-harness.sh --strict`.
Cloud tests use isolated stubs/interception, no real account or remote writes.
