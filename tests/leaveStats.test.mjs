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

const { isUpcomingEntry, plannedDays, monthlyDays, publicHolidayMap, cumulativeDays } = await import("../src/utils/leaveStats.ts");

const dated = (id, startDate, endDate, extra = {}) => ({ id, createdAt: 1, kind: "dates", label: id, startDate, endDate, ...extra });

describe("Refonte v2 : statistiques de congés", () => {
  const today = new Date(2026, 10, 27);
  it("classe les congés à venir et passés", () => {
    assert.equal(isUpcomingEntry(dated("noel", "2026-12-21", "2026-12-24"), "2026", today), true);
    assert.equal(isUpcomingEntry(dated("ete", "2026-07-27", "2026-08-14"), "2026", today), false);
    assert.equal(isUpcomingEntry({ id: "m", createdAt: 1, kind: "month", label: "m", month: 11, days: 2 }, "2026", today), true);
    assert.equal(isUpcomingEntry({ id: "m", createdAt: 1, kind: "month", label: "m", month: 10, days: 2 }, "2026", today), false);
    assert.equal(isUpcomingEntry({ id: "m", createdAt: 1, kind: "month", label: "m", month: 0, days: 2 }, "2027", today), true);
  });
  it("calcule la part à venir", () => {
    const entries = [dated("noel", "2026-12-21", "2026-12-24"), dated("ete", "2026-07-27", "2026-08-14")];
    assert.equal(plannedDays(entries, "2026", today), 4);
  });
  it("répartit les jours ouvrés par mois, demi-journées comprises", () => {
    const months = monthlyDays([
      dated("ete", "2026-07-27", "2026-08-14"),
      dated("rdv", "2026-10-09", "2026-10-09", { startHalf: "afternoon", endHalf: "afternoon" }),
      dated("pont", "2026-01-30", "2026-02-02", { startHalf: "afternoon" }),
      { id: "m", createdAt: 1, kind: "month", label: "m", month: 11, days: 4 },
    ], "2026");
    assert.equal(months[6], 5);
    assert.equal(months[7], 10);
    assert.equal(months[9], 0.5);
    assert.equal(months[0], 0.5);
    assert.equal(months[1], 1);
    assert.equal(months[11], 4);
  });
  it("cumule les jours posés de mois en mois", () => {
    const points = cumulativeDays([0, 5, 0, 0, 1, 0, 5, 10, 0, 0.5, 0, 4]);
    assert.equal(points.length, 13);
    assert.equal(points[0], 0);
    assert.equal(points[2], 5);
    assert.equal(points[8], 21);
    assert.equal(points[12], 25.5);
  });
  it("indexe les fériés luxembourgeois", () => {
    const holidays = publicHolidayMap(2026);
    assert.equal(holidays.get("2026-12-25"), "Premier jour de Noël");
    assert.equal(holidays.has("2026-12-24"), false);
  });
});
