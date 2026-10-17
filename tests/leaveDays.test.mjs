import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";

// Setup TypeScript runtime transpiler loader for direct TS module imports
const require = createRequire(import.meta.url);
const tsPath = require.resolve("typescript");

const loaderSource = `
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

let ts;
export async function initialize(data) {
  ts = (await import(pathToFileURL(data.tsPath).href)).default;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: result.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

const loaderUrl = "data:text/javascript," + encodeURIComponent(loaderSource);
register(loaderUrl, import.meta.url, { data: { tsPath } });

const {
  toISODate,
  parseISODate,
  formatDateFr,
  workingDaysCount,
  entryTotalDays,
  entryOrderKey,
} = await import("../src/utils/leaveDays.ts");

const {
  calculatePlanBudget,
  calculatePlanTaken,
  calculatePlanRemaining,
} = await import("../src/utils/yearPlanUtils.ts");

const {
  getLuxembourgPublicHolidays,
  countLuxembourgCompensatoryHolidays,
} = await import("../src/utils/luxembourgHolidays.ts");

describe("leaveDays utils & leave calculations", () => {
  describe("toISODate & parseISODate & formatDateFr", () => {
    it("formats dates to YYYY-MM-DD", () => {
      const d = new Date(2026, 4, 15); // May 15, 2026
      assert.equal(toISODate(d), "2026-05-15");
    });

    it("parses valid ISO string to Date", () => {
      const d = parseISODate("2026-06-23");
      assert.ok(d instanceof Date);
      assert.equal(d.getFullYear(), 2026);
      assert.equal(d.getMonth(), 5); // June = index 5
      assert.equal(d.getDate(), 23);
    });

    it("returns null on non-matching date formats", () => {
      assert.equal(parseISODate("invalid-date"), null);
      assert.equal(parseISODate("2026/06/23"), null);
      assert.equal(parseISODate(""), null);
    });

    it("formats ISO date to French display string", () => {
      assert.equal(formatDateFr("2026-06-23"), "23 juin 2026");
      assert.equal(formatDateFr("invalid"), "invalid");
    });
  });

  describe("workingDaysCount", () => {
    it("returns 0 when end date is before start date", () => {
      assert.equal(workingDaysCount("2026-06-10", "2026-06-05"), 0);
    });

    it("counts a single full working day as 1", () => {
      // 2026-06-10 is a Wednesday (working day, non-holiday)
      assert.equal(workingDaysCount("2026-06-10", "2026-06-10"), 1);
    });

    it("counts single half-days as 0.5", () => {
      // Wednesday morning only
      assert.equal(
        workingDaysCount("2026-06-10", "2026-06-10", "morning", "morning"),
        0.5
      );
      // Wednesday afternoon only
      assert.equal(
        workingDaysCount("2026-06-10", "2026-06-10", "afternoon", "afternoon"),
        0.5
      );
    });

    it("returns 0 for invalid single-day half-day combinations", () => {
      // afternoon to morning on the same day is invalid
      assert.equal(
        workingDaysCount("2026-06-10", "2026-06-10", "afternoon", "morning"),
        0
      );
    });

    it("returns 0 for a weekend day", () => {
      // 2026-06-13 is Saturday, 2026-06-14 is Sunday
      assert.equal(workingDaysCount("2026-06-13", "2026-06-13"), 0);
      assert.equal(workingDaysCount("2026-06-14", "2026-06-14"), 0);
    });

    it("returns 0 for Luxembourg public holiday", () => {
      // 2026-06-23 is Luxembourg National Day (Tuesday)
      assert.equal(workingDaysCount("2026-06-23", "2026-06-23"), 0);
      // 2026-05-01 is Premier Mai (Friday)
      assert.equal(workingDaysCount("2026-05-01", "2026-05-01"), 0);
    });

    it("calculates working days across a normal 5-day week", () => {
      // 2026-06-01 (Monday) to 2026-06-05 (Friday) = 5 days
      assert.equal(workingDaysCount("2026-06-01", "2026-06-05"), 5);
    });

    it("skips weekends during multi-day ranges", () => {
      // 2026-06-01 (Monday) to 2026-06-12 (Friday next week) = 10 working days
      assert.equal(workingDaysCount("2026-06-01", "2026-06-12"), 10);
    });

    it("deducts Luxembourg public holidays in multi-day range", () => {
      // 2026-06-22 (Mon) to 2026-06-26 (Fri), Tuesday 23 June is National Day
      // 5 weekdays - 1 holiday = 4 working days
      assert.equal(workingDaysCount("2026-06-22", "2026-06-26"), 4);
    });

    it("handles half-days at start and end of range", () => {
      // 2026-06-01 afternoon to 2026-06-05 morning:
      // Mon afternoon (0.5) + Tue, Wed, Thu (3) + Fri morning (0.5) = 4.0
      assert.equal(
        workingDaysCount("2026-06-01", "2026-06-05", "afternoon", "morning"),
        4
      );
    });
  });

  describe("entryTotalDays", () => {
    it("computes dates entry total via workingDaysCount", () => {
      const entry = {
        id: "1",
        createdAt: Date.now(),
        kind: "dates",
        label: "Congé été",
        startDate: "2026-07-06", // Monday
        endDate: "2026-07-10",   // Friday
      };
      assert.equal(entryTotalDays(entry), 5);
    });

    it("returns fixed days value for month kind entry", () => {
      const entry = {
        id: "2",
        createdAt: Date.now(),
        kind: "month",
        label: "Forfait août",
        month: 7, // August
        days: 12.5,
      };
      assert.equal(entryTotalDays(entry), 12.5);
    });
  });

  describe("entryOrderKey", () => {
    it("orders month entries by month index * 100", () => {
      const entry = { id: "1", createdAt: 0, kind: "month", label: "M", month: 5, days: 3 };
      assert.equal(entryOrderKey(entry), 500);
    });

    it("orders dates entries by month * 100 + day", () => {
      const entry = {
        id: "2",
        createdAt: 0,
        kind: "dates",
        label: "D",
        startDate: "2026-08-14",
        endDate: "2026-08-14",
      };
      // August is month 7 (0-indexed) * 100 + 14 = 714
      assert.equal(entryOrderKey(entry), 714);
    });
  });

  describe("calculatePlanTaken, calculatePlanBudget & calculatePlanRemaining", () => {
    it("calculates 0 taken days for empty plan entries", () => {
      const plan = {
        id: "2026",
        year: "2026",
        createdAt: 0,
        initialLeave: 26,
        carriedOver: 2,
        csupp: 1,
        publicHolidays: 0,
        entries: [],
      };
      assert.equal(calculatePlanTaken(plan), 0);
    });

    it("sums taken days correctly across multiple entries", () => {
      const plan = {
        id: "2026",
        year: "2026",
        createdAt: 0,
        initialLeave: 26,
        carriedOver: 2,
        csupp: 1,
        publicHolidays: 0,
        entries: [
          {
            id: "e1",
            createdAt: 1,
            kind: "dates",
            label: "Semaine juin",
            startDate: "2026-06-01",
            endDate: "2026-06-05", // 5 days
          },
          {
            id: "e2",
            createdAt: 2,
            kind: "dates",
            label: "Demi-journée",
            startDate: "2026-06-10",
            endDate: "2026-06-10",
            startHalf: "morning",
            endHalf: "morning", // 0.5 day
          },
          {
            id: "e3",
            createdAt: 3,
            kind: "month",
            label: "Forfait",
            month: 7,
            days: 4, // 4 days
          },
        ],
      };
      assert.equal(calculatePlanTaken(plan), 9.5);
    });

    it("calculates remaining balance considering budget, holidays and taken", () => {
      const compensatory = countLuxembourgCompensatoryHolidays("2026");
      const plan = {
        id: "2026",
        year: "2026",
        createdAt: 0,
        initialLeave: 26,
        carriedOver: 2,
        csupp: 1,
        publicHolidays: 0,
        entries: [
          {
            id: "e1",
            createdAt: 1,
            kind: "dates",
            label: "Semaine juin",
            startDate: "2026-06-01",
            endDate: "2026-06-05", // 5 days
          },
        ],
      };
      const expectedBudget = 26 + 2 + 1 + compensatory;
      assert.equal(calculatePlanBudget(plan), expectedBudget);
      assert.equal(calculatePlanRemaining(plan), expectedBudget - 5);
    });
  });

  describe("Luxembourg public holidays law", () => {
    it("returns 11 legal public holidays per year", () => {
      const holidays = getLuxembourgPublicHolidays(2026);
      assert.equal(holidays.length, 11);
    });

    it("contains official Luxembourg holidays", () => {
      const holidays = getLuxembourgPublicHolidays(2026);
      const names = holidays.map((h) => h.name);
      assert.ok(names.includes("Nouvel An"));
      assert.ok(names.includes("Premier Mai"));
      assert.ok(names.includes("Journée de l'Europe"));
      assert.ok(names.includes("Fête nationale"));
      assert.ok(names.includes("Toussaint"));
      assert.ok(names.includes("Premier jour de Noël"));
    });
  });
});
