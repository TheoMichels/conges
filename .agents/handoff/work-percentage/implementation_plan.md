# Annual work percentage
Type: front · Branch: feature/work-percentage
## Scope
Annual working percentage, default 100%, prorates all Luxembourg compensatory holidays (weekends and coincidences). No change to initial leave, csupp, leave counting or manually entered rights. No mid-year schedules. Local and cloud persistence, backward-compatible migration. No remote writes or deployment before go.
## Acceptance criteria
- AC-01: Existing and new plans show 100% by default; user can set an annual percentage >0 and <=100 with at most two decimal places. Invalid/empty values cannot overwrite the saved rate and receive a French error. Rate is independent per year.
- AC-02: All compensatory days are multiplied by rate/100, rounded to two decimals; 3 days at 80% = 2.4 days. Same calculation powers details, budget, remaining balance and carry-over propagation. Initial leave, csupp and entries are not prorated. At 100% results match previous behavior.
- AC-03: Rate persists after reload in local storage and survives cloud upload/download mapping (including updates). Old records without rate read as 100%; existing entries and other rights preserved. Prisma additive migration defines default and bounds. No remote migration applied.
- AC-04: French accessible annual rate control and explanation of prorated holidays, coherent with existing UI; detail distinguishes original count and adjusted entitlement, desktop/mobile 375px without overflow. Existing holiday details (weekend/coincidence) remain visible.
## Verification
- AC-01: validation/unit tests + E2E rate editing, invalid entry and year independence.
- AC-02: unit tests weekends/coincidences, decimals, totals/carry-over and 100% regression + visible E2E totals.
- AC-03: storage and sync mapping integration tests + E2E reload; migration static/Prisma validation (DB execution only if disposable local DB available, document otherwise).
- AC-04: targeted Playwright desktop/mobile and independent integrated-browser inspection.
- Final harness after commit: bash /Users/theomichels/.config/opencode/skills/autonomous-qa/scripts/verify-harness.sh --strict --e2e "<affected specs>". Storage is transverse: run complete E2E suite if shared storage behavior changes.
## Delivery
Builder reads fullstack-builder, ui-ux-designer, test-architect and relevant TypeScript/stack/security rules; writes test-contract.md and build-report.md <=40 lines, updates project sheet. Independent security/sync review and QA required. Commit on assigned branch, no push.
