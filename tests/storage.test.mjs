import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Custom Node ESM loader configuring TypeScript transpilation and in-memory mocks
const require = createRequire(import.meta.url);
const tsPath = require.resolve("typescript");

const loaderSource = `
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

let ts;
export async function initialize(data) {
  ts = (await import(pathToFileURL(data.tsPath).href)).default;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@react-native-async-storage/async-storage") {
    return {
      url: "virtual:async-storage",
      shortCircuit: true,
    };
  }
  if (specifier === "expo-constants") {
    return {
      url: "virtual:expo-constants",
      shortCircuit: true,
    };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      for (const ext of [".ts", ".tsx", ".js", "/index.ts", "/index.js"]) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url === "virtual:async-storage") {
    return {
      format: "module",
      shortCircuit: true,
      source: \`
        const store = new Map();
        const AsyncStorage = {
          async getItem(key) { return store.has(key) ? store.get(key) : null; },
          async setItem(key, value) { store.set(key, String(value)); },
          async removeItem(key) { store.delete(key); },
          async clear() { store.clear(); },
          async getAllKeys() { return Array.from(store.keys()); },
          _getStore() { return store; }
        };
        export default AsyncStorage;
      \`,
    };
  }
  if (url === "virtual:expo-constants") {
    return {
      format: "module",
      shortCircuit: true,
      source: \`
        export default {
          expoConfig: {
            extra: { storageMode: "local" }
          }
        };
      \`,
    };
  }
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, "utf8");
    const result = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    });
    return {
      format: "module",
      shortCircuit: true,
      source: result.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

const loaderUrl = "data:text/javascript," + encodeURIComponent(loaderSource);
register(loaderUrl, import.meta.url, { data: { tsPath } });

// Imports after loader registration
const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

const {
  halfDaySchema,
  leaveEntryDraftSchema,
  leaveEntrySchema,
  yearPlanSchema,
  yearPlansSchema,
} = await import("../src/types/yearPlan.ts");

const {
  resolveStorageMode,
  storageMode,
  isLocalMode,
} = await import("../src/config/storageMode.ts");

const {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  yearPlanRepository,
  loadFromLocalStorage,
} = await import("../src/storage/yearPlanRepository.ts");

describe("Lot 3 — Zod Schemas (AC-01)", () => {
  it("validates HalfDay enum values", () => {
    assert.equal(halfDaySchema.parse("morning"), "morning");
    assert.equal(halfDaySchema.parse("afternoon"), "afternoon");
    assert.throws(() => halfDaySchema.parse("evening"));
  });

  it("validates LeaveEntryDraft with kind 'dates'", () => {
    const valid = {
      kind: "dates",
      label: "Vacances d'été",
      startDate: "2025-07-01",
      endDate: "2025-07-15",
      startHalf: "morning",
      endHalf: "afternoon",
    };
    const parsed = leaveEntryDraftSchema.parse(valid);
    assert.equal(parsed.kind, "dates");
    assert.equal(parsed.label, "Vacances d'été");

    // Invalid half day
    assert.throws(() =>
      leaveEntryDraftSchema.parse({
        ...valid,
        startHalf: "midday",
      })
    );
  });

  it("validates LeaveEntryDraft with kind 'month'", () => {
    const valid = {
      kind: "month",
      label: "Congés mai",
      month: 4,
      days: 3,
    };
    const parsed = leaveEntryDraftSchema.parse(valid);
    assert.equal(parsed.kind, "month");
    assert.equal(parsed.month, 4);

    // month out of range
    assert.throws(() =>
      leaveEntryDraftSchema.parse({
        ...valid,
        month: 12,
      })
    );
    // negative days
    assert.throws(() =>
      leaveEntryDraftSchema.parse({
        ...valid,
        days: -1,
      })
    );
  });

  it("validates full LeaveEntry including id and createdAt", () => {
    const entry = {
      id: "entry-1",
      kind: "dates",
      label: "Pont de mai",
      startDate: "2025-05-02",
      endDate: "2025-05-02",
      createdAt: 1714608000000,
    };
    const parsed = leaveEntrySchema.parse(entry);
    assert.equal(parsed.id, "entry-1");
    assert.equal(parsed.createdAt, 1714608000000);

    // missing id
    assert.throws(() => {
      const { id, ...invalid } = entry;
      leaveEntrySchema.parse(invalid);
    });
  });

  it("validates a YearPlan with nested entries", () => {
    const plan = {
      id: "plan-2025",
      year: "2025",
      createdAt: 1735689600000,
      initialLeave: 26,
      carriedOver: 2,
      csupp: 0,
      publicHolidays: 1,
      entries: [
        {
          id: "e-1",
          kind: "dates",
          label: "Ski",
          startDate: "2025-02-10",
          endDate: "2025-02-14",
          createdAt: 1735689600000,
        },
      ],
    };
    const parsed = yearPlanSchema.parse(plan);
    assert.equal(parsed.year, "2025");
    assert.equal(parsed.entries.length, 1);

    // Array of plans
    const parsedList = yearPlansSchema.parse([parsed]);
    assert.equal(parsedList.length, 1);

    // Rejects non-array or invalid element
    assert.throws(() => yearPlansSchema.parse("invalid"));
    assert.throws(() => yearPlansSchema.parse([{ ...plan, initialLeave: "twenty-six" }]));
  });
});

describe("Lot 3 — Storage Mode (AC-02)", () => {
  it("resolves loopback hostnames strictly to 'local' mode regardless of build mode", () => {
    assert.equal(resolveStorageMode("supabase", "localhost"), "local");
    assert.equal(resolveStorageMode("supabase", "LOCALHOST"), "local");
    assert.equal(resolveStorageMode("supabase", "app.localhost"), "local");
    assert.equal(resolveStorageMode("supabase", "127.0.0.1"), "local");
    assert.equal(resolveStorageMode("supabase", "127.0.1.1"), "local");
    assert.equal(resolveStorageMode("supabase", "::1"), "local");
    assert.equal(resolveStorageMode("supabase", "[::1]"), "local");
  });

  it("resolves non-loopback Vercel host to 'supabase' when buildMode is supabase", () => {
    assert.equal(resolveStorageMode("supabase", "holidays.vercel.app"), "supabase");
    assert.equal(resolveStorageMode("supabase", "preview-holidays.vercel.app"), "supabase");
  });

  it("resolves non-loopback host to 'local' when buildMode is local or undefined", () => {
    assert.equal(resolveStorageMode("local", "holidays.vercel.app"), "local");
    assert.equal(resolveStorageMode(undefined, "holidays.vercel.app"), "local");
    assert.equal(resolveStorageMode(undefined, undefined), "local");
  });

  it("exports storageMode and isLocalMode", () => {
    assert.equal(typeof storageMode, "string");
    assert.equal(typeof isLocalMode, "boolean");
    // Under test environment without window or VERCEL=1, default is local
    assert.equal(isLocalMode, true);
  });
});

describe("Lot 3 — Repository & Migration (AC-03)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("uses the canonical storage key @holy_year_plans_v1 and legacy key @holidays_year_plans_v1", () => {
    assert.equal(STORAGE_KEY, "@holy_year_plans_v1");
    assert.equal(LEGACY_STORAGE_KEY, "@holidays_year_plans_v1");
  });

  it("initializes with seed plans when storage is empty", async () => {
    const plans = await yearPlanRepository.list();
    assert.ok(plans.length >= 2, "Should initialize with seed plans");
    assert.ok(plans.some((p) => p.year === "2024"));
    assert.ok(plans.some((p) => p.year === "2025"));

    // Stored in canonical key
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null, "Canonical key should have been populated");
    const stored = JSON.parse(raw);
    assert.equal(stored.length, plans.length);
  });

  it("migrates automatically from @holidays_year_plans_v1 to @holy_year_plans_v1 and removes the old key", async () => {
    const legacyData = [
      {
        id: "legacy-2023",
        year: "2023",
        createdAt: 1672531200000,
        initialLeave: 25,
        carriedOver: 0,
        csupp: 1,
        publicHolidays: 2,
        entries: [
          {
            id: "leg-entry-1",
            kind: "month",
            month: 7,
            days: 10,
            label: "Août",
            createdAt: 1672531200000,
          },
        ],
      },
    ];

    // Seed only legacy @holidays_year_plans_v1 key
    await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));
    assert.equal(await AsyncStorage.getItem(STORAGE_KEY), null);

    // Call list() to trigger automatic migration
    const plans = await yearPlanRepository.list();
    assert.equal(plans.length, 1);
    assert.equal(plans[0].year, "2023");
    assert.equal(plans[0].entries[0].label, "Août");

    // Canonical key now contains the migrated data
    const canonicalRaw = await AsyncStorage.getItem(STORAGE_KEY);
    assert.ok(canonicalRaw !== null, "Canonical key must be populated after migration");
    const canonicalParsed = JSON.parse(canonicalRaw);
    assert.equal(canonicalParsed[0].year, "2023");

    // Legacy @holidays_year_plans_v1 key is removed after migration
    const legacyRawAfter = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    assert.equal(legacyRawAfter, null, "Legacy @holidays_year_plans_v1 key must be deleted after migration");
  });

  it("migrates transparently from conges:yearPlans when both canonical and @holidays_year_plans_v1 are empty", async () => {
    const legacyCongesData = [
      {
        id: "conges-2021",
        year: "2021",
        createdAt: 1609459200000,
        initialLeave: 26,
        carriedOver: 1,
        csupp: 0,
        publicHolidays: 0,
        entries: [],
      },
    ];
    await AsyncStorage.setItem("conges:yearPlans", JSON.stringify(legacyCongesData));
    const plans = await yearPlanRepository.list();
    assert.equal(plans.length, 1);
    assert.equal(plans[0].year, "2021");
  });

  it("normalizes legacy months: number[] format during migration", async () => {
    const legacyMonthsData = [
      {
        id: "plan-with-months",
        year: "2022",
        createdAt: 1640995200000,
        initialLeave: 25,
        carriedOver: 0,
        months: [0, 0, 5, 0, 0, 0, 0, 10, 0, 0, 0, 2], // March, August, Dec
      },
    ];

    await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyMonthsData));
    const plans = await yearPlanRepository.list();

    assert.equal(plans.length, 1);
    assert.equal(plans[0].year, "2022");
    // Should have generated 3 month entries
    assert.equal(plans[0].entries.length, 3);
    assert.equal(plans[0].entries[0].month, 2);
    assert.equal(plans[0].entries[0].days, 5);
    assert.equal(plans[0].entries[1].month, 7);
    assert.equal(plans[0].entries[1].days, 10);
    assert.equal(plans[0].entries[2].month, 11);
    assert.equal(plans[0].entries[2].days, 2);
  });

  it("provides full CRUD operations: get, create, update, remove, saveAll", async () => {
    // 1. Initialize
    await yearPlanRepository.list();

    // 2. Create
    const created = await yearPlanRepository.create({
      year: "2027",
      initialLeave: 28,
      carriedOver: 0,
      csupp: 2,
      publicHolidays: 2,
    });
    assert.equal(created.year, "2027");
    assert.equal(created.initialLeave, 28);
    assert.ok(created.id);

    // 3. Get
    const fetched = await yearPlanRepository.get(created.id);
    assert.ok(fetched !== null);
    assert.equal(fetched.id, created.id);
    assert.equal(fetched.year, "2027");

    const nonExistent = await yearPlanRepository.get("unknown-id");
    assert.equal(nonExistent, null);

    // 4. Update
    const updated = await yearPlanRepository.update(created.id, {
      initialLeave: 30,
      csupp: 4,
    });
    assert.equal(updated.id, created.id);
    assert.equal(updated.initialLeave, 30);
    assert.equal(updated.csupp, 4);

    const reFetched = await yearPlanRepository.get(created.id);
    assert.equal(reFetched?.initialLeave, 30);

    // 5. Remove
    await yearPlanRepository.remove(created.id);
    const afterRemove = await yearPlanRepository.get(created.id);
    assert.equal(afterRemove, null);

    // 6. saveAll and validation
    const currentList = await yearPlanRepository.list();
    await yearPlanRepository.saveAll(currentList);

    // saveAll throws when given invalid schema
    await assert.rejects(
      async () => {
        await yearPlanRepository.saveAll([{ ...currentList[0], year: 1234 }]);
      },
      (err) => err.name === "ZodError"
    );
  });

  it("performs zero network calls in local mode", async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("Network called in local mode!");
    };

    try {
      const plans = await yearPlanRepository.list();
      assert.ok(plans.length > 0);
      await yearPlanRepository.saveAll(plans);
      assert.equal(fetchCalled, false, "fetch should never be called when isLocalMode is true");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
