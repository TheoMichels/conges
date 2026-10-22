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
  if (specifier === "react-native") {
    return {
      url: "virtual:react-native",
      shortCircuit: true,
    };
  }
  if (
    specifier === "./supabaseClient" ||
    specifier.endsWith("/supabaseClient") ||
    specifier.endsWith("/supabaseClient.ts")
  ) {
    return {
      url: "virtual:supabase-client",
      shortCircuit: true,
    };
  }

  const contextQuery =
    context.parentURL && context.parentURL.includes("?")
      ? "?" + context.parentURL.split("?")[1]
      : "";
  const [baseSpecifier, specQuery] = specifier.split("?");
  const effectiveQuery = specQuery ? "?" + specQuery : contextQuery;

  try {
    const resolved = await nextResolve(baseSpecifier, context);
    if (effectiveQuery && resolved.url.startsWith("file:")) {
      return {
        url: resolved.url + effectiveQuery,
        shortCircuit: true,
      };
    }
    return resolved;
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      for (const ext of [".ts", ".tsx", ".js", "/index.ts", "/index.js"]) {
        try {
          const resolved = await nextResolve(baseSpecifier + ext, context);
          if (effectiveQuery && resolved.url.startsWith("file:")) {
            return {
              url: resolved.url + effectiveQuery,
              shortCircuit: true,
            };
          }
          return resolved;
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url === "virtual:supabase-client") {
    return {
      format: "module",
      shortCircuit: true,
      source: \`
        export let supabase = null;
        export function setTestSupabase(client) {
          supabase = client;
        }
      \`,
    };
  }
  if (url === "virtual:react-native") {
    return {
      format: "module",
      shortCircuit: true,
      source: \`
        export const Platform = { OS: "web" };
        export default { Platform };
      \`,
    };
  }
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
          async multiRemove(keys) { for (const k of keys) store.delete(k); },
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
          get expoConfig() {
            return {
              extra: { storageMode: globalThis.__TEST_STORAGE_MODE__ || "local" }
            };
          }
        };
      \`,
    };
  }
  const cleanUrl = url.split("?")[0];
  if (cleanUrl.endsWith(".ts") || cleanUrl.endsWith(".tsx")) {
    const filePath = fileURLToPath(cleanUrl);
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

const { setTestSupabase } = await import("virtual:supabase-client");
const { syncService } = await import("../src/services/syncService.ts");

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

  it("AC-01: initializes empty storage with an authoritative empty plan list", async () => {
    const plans = await yearPlanRepository.list();
    assert.deepEqual(plans, []);
    assert.deepEqual(await yearPlanRepository.list(), []);

    // Stored in canonical key
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    assert.ok(raw !== null, "Canonical key should have been populated");
    const stored = JSON.parse(raw);
    assert.deepEqual(stored, []);
  });

  it("AC-01: canonical empty plans override legacy data", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "[]");
    await AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([{ id: "legacy", year: "2023" }]));

    assert.deepEqual(await loadFromLocalStorage(), []);
    assert.equal(await AsyncStorage.getItem(LEGACY_STORAGE_KEY) !== null, true);
  });

  it("AC-03: preserves a legitimate zero-balance empty plan", async () => {
    const emptyPlan = {
      id: "empty-plan", year: "2026", createdAt: 1,
      initialLeave: 0, carriedOver: 0, csupp: 0, publicHolidays: 0, entries: [],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([emptyPlan]));

    assert.deepEqual(await loadFromLocalStorage(), [emptyPlan]);
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
      assert.deepEqual(plans, []);
      await yearPlanRepository.saveAll(plans);
      assert.equal(fetchCalled, false, "fetch should never be called when isLocalMode is true");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("Sync & Remote Mode — Non-régression 405 (AC-01, AC-02, AC-03)", () => {
  it("AC-01: yearPlanRepository has permanently removed getApiUrl and never calls /api/conges", () => {
    assert.equal("getApiUrl" in yearPlanRepository, false);
    assert.equal(typeof yearPlanRepository.getApiUrl, "undefined");
  });

  it("AC-03: In local mode (isLocalMode === true), saveAll persists to AsyncStorage and makes 0 remote calls", async () => {
    let pushCalled = false;
    const originalPush = syncService.pushToCloud;
    syncService.pushToCloud = async () => {
      pushCalled = true;
    };

    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("HTTP fetch called!");
    };

    try {
      const plans = await yearPlanRepository.list();
      await yearPlanRepository.saveAll(plans);
      assert.equal(pushCalled, false, "syncService.pushToCloud must not be called in local mode");
      assert.equal(fetchCalled, false, "fetch must not be called in local mode");

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      assert.ok(raw !== null);
      assert.equal(JSON.parse(raw).length, plans.length);
    } finally {
      syncService.pushToCloud = originalPush;
      globalThis.fetch = originalFetch;
    }
  });

  it("AC-01: In remote mode (!isLocalMode), saveAll delegates to syncService.pushToCloud with 0 HTTP calls to /api/conges", async () => {
    globalThis.__TEST_STORAGE_MODE__ = "supabase";
    globalThis.window = { location: { hostname: "holidays.vercel.app" } };

    const remoteSync = await import("../src/services/syncService.ts?mode=supabase-save");
    const remoteRepo = await import("../src/storage/yearPlanRepository.ts?mode=supabase-save");

    let pushedPlans = null;
    remoteSync.syncService.pushToCloud = async (plans) => {
      pushedPlans = plans;
    };

    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("fetch called unexpectedly in remote mode!");
    };

    try {
      const testPlan = {
        id: "plan-remote-2025",
        year: "2025",
        createdAt: 1735689600000,
        initialLeave: 26,
        carriedOver: 0,
        csupp: 0,
        publicHolidays: 11,
        entries: [],
      };

      await remoteRepo.yearPlanRepository.saveAll([testPlan]);

      assert.equal(fetchCalled, false, "fetch (/api/conges) must never be called");
      assert.ok(pushedPlans !== null, "syncService.pushToCloud must have been called");
      assert.equal(pushedPlans[0].id, "plan-remote-2025");

      // Verifies local cache was also updated
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      assert.ok(cached !== null);
      assert.equal(JSON.parse(cached)[0].id, "plan-remote-2025");
    } finally {
      globalThis.fetch = originalFetch;
      delete globalThis.window;
      delete globalThis.__TEST_STORAGE_MODE__;
    }
  });

  it("AC-01: In remote mode, list() delegates to syncService.pullFromCloud()", async () => {
    globalThis.__TEST_STORAGE_MODE__ = "supabase";
    globalThis.window = { location: { hostname: "holidays.vercel.app" } };

    const remoteSync = await import("../src/services/syncService.ts?mode=supabase-list");
    const remoteRepo = await import("../src/storage/yearPlanRepository.ts?mode=supabase-list");

    let pullCalled = false;
    remoteSync.syncService.pullFromCloud = async () => {
      pullCalled = true;
      return [
        {
          id: "plan-pulled",
          year: "2026",
          createdAt: Date.now(),
          initialLeave: 26,
          carriedOver: 0,
          csupp: 0,
          publicHolidays: 11,
          entries: [],
        },
      ];
    };

    try {
      const plans = await remoteRepo.yearPlanRepository.list();
      assert.equal(pullCalled, true, "list() must delegate to pullFromCloud()");
      assert.equal(plans[0].id, "plan-pulled");
    } finally {
      delete globalThis.window;
      delete globalThis.__TEST_STORAGE_MODE__;
    }
  });

  it("AC-02: syncService.upsertCloudPlan cleans up orphan leave entries and resolves userId autonomously", async () => {
    let deletedEntries = null;
    let upsertedEntries = null;
    let upsertedPlan = null;

    const mockSupabase = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-auto-123" } } } };
        },
      },
      from(table) {
        if (table === "year_plans") {
          return {
            async upsert(row) {
              upsertedPlan = row;
              return { error: null };
            },
          };
        }
        if (table === "leave_entries") {
          return {
            async upsert(rows) {
              upsertedEntries = rows;
              return { error: null };
            },
            select() {
              return {
                eq() {
                  return {
                    async eq() {
                      // Simule 3 entrées existantes en base: e1, e2, et l'orpheline e3-deleted
                      return {
                        data: [{ id: "e1" }, { id: "e2" }, { id: "e3-deleted" }],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            delete() {
              return {
                eq(c1, v1) {
                  return {
                    eq(c2, v2) {
                      return {
                        async in(c3, ids) {
                          deletedEntries = ids;
                          return { error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    setTestSupabase(mockSupabase);
    try {
      const plan = {
        id: "plan-cleanup",
        year: "2025",
        createdAt: 1735689600000,
        initialLeave: 26,
        carriedOver: 0,
        csupp: 0,
        publicHolidays: 11,
        entries: [
          { id: "e1", kind: "month", label: "M1", month: 1, days: 2, createdAt: 1000 },
          { id: "e2", kind: "dates", label: "V1", startDate: "2025-07-01", endDate: "2025-07-05", createdAt: 2000 },
        ],
      };

      // Appelé SANS userId pour tester la résolution autonome
      await syncService.upsertCloudPlan(plan);

      assert.equal(upsertedPlan.id, "plan-cleanup");
      assert.equal(upsertedPlan.user_id, "user-auto-123");
      assert.equal(upsertedEntries.length, 2);
      assert.deepEqual(deletedEntries, ["e3-deleted"]);
    } finally {
      setTestSupabase(null);
    }
  });

  it("AC-01 / AC-02 / AC-03: sync keeps one canonical plan per user/year and preserves its entries", async () => {
    const yearPlans = [];
    const leaveEntries = [];
    const mockSupabase = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-a" } } } };
        },
      },
      from(table) {
        if (table === "year_plans") {
          return {
            upsert(row, options) {
              const execute = async () => {
                const sameYear = yearPlans.find(
                  (candidate) => candidate.user_id === row.user_id && candidate.year === row.year
                );
                if (sameYear && options?.onConflict === "user_id,year" && options.ignoreDuplicates) {
                  return { data: null, error: null };
                }
                if (sameYear) {
                  return { data: null, error: { message: "duplicate key value violates unique constraint idx_year_plans_user_year" } };
                }
                if (yearPlans.some((candidate) => candidate.id === row.id)) {
                  return { data: null, error: { message: "duplicate key value violates unique constraint year_plans_pkey" } };
                }
                yearPlans.push({ ...row });
                return { data: { id: row.id }, error: null };
              };
              return {
                select() {
                  return {
                    maybeSingle: execute,
                  };
                },
                then(resolve, reject) {
                  return execute().then(resolve, reject);
                },
              };
            },
            select() {
              return {
                eq(_column, userId) {
                  return {
                    eq(_yearColumn, year) {
                      return {
                        async single() {
                          return {
                            data: yearPlans.find((row) => row.user_id === userId && row.year === year) ?? null,
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
            update(values) {
              return {
                eq(_column, id) {
                  return {
                    async eq(_userColumn, userId) {
                      const row = yearPlans.find((candidate) => candidate.id === id && candidate.user_id === userId);
                      Object.assign(row, values);
                      return { error: null };
                    },
                  };
                },
              };
            },
          };
        }
        if (table === "leave_entries") {
          return {
            async upsert(rows) {
              for (const row of rows) {
                if (!leaveEntries.some((entry) => entry.id === row.id)) leaveEntries.push(row);
              }
              return { error: null };
            },
            select() {
              return {
                eq() {
                  return {
                    async eq() {
                      return { data: leaveEntries.map(({ id }) => ({ id })), error: null };
                    },
                  };
                },
              };
            },
            delete() {
              return { eq: () => ({ eq: async () => ({ error: null }) }) };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    setTestSupabase(mockSupabase);
    try {
      const first = {
        id: "plan-canonical",
        year: "2026",
        createdAt: 1735689600000,
        initialLeave: 26,
        carriedOver: 0,
        csupp: 0,
        publicHolidays: 11,
        entries: [{ id: "entry-canonical", kind: "month", label: "Mai", month: 5, days: 2, createdAt: 1000 }],
      };
      const concurrent = { ...first, id: "plan-temporary", entries: [] };
      const canonicalIds = await Promise.all([
        syncService.upsertCloudPlan(first, "user-a"),
        syncService.upsertCloudPlan(concurrent, "user-a"),
      ]);

      assert.deepEqual(canonicalIds, ["plan-canonical", "plan-canonical"]);
      assert.equal(yearPlans.length, 1);
      assert.equal(yearPlans[0].id, "plan-canonical");
      assert.equal(leaveEntries.length, 1);
      assert.equal(leaveEntries[0].plan_id, "plan-canonical");

      await assert.rejects(
        syncService.upsertCloudPlan({ ...first, year: "2027" }, "user-b"),
        /year_plans_pkey/
      );
      assert.equal(yearPlans.length, 1, "a duplicate primary key from another account must not reassign its row");
    } finally {
      setTestSupabase(null);
    }

    const previousMode = globalThis.__TEST_STORAGE_MODE__;
    globalThis.__TEST_STORAGE_MODE__ = "supabase";
    const remoteSync = await import("../src/services/syncService.ts?canonical-plan");
    const remoteRepository = await import("../src/storage/yearPlanRepository.ts?canonical-plan");
    remoteSync.syncService.pushToCloud = async (plans) => plans.map((plan) => ({ ...plan, id: "plan-canonical" }));
    const repositoryPlan = {
      id: "plan-temporary",
      year: "2026",
      createdAt: 1735689600000,
      initialLeave: 26,
      carriedOver: 0,
      csupp: 0,
      publicHolidays: 11,
      entries: [],
    };
    try {
      await remoteRepository.yearPlanRepository.saveAll([repositoryPlan]);
      assert.equal(repositoryPlan.id, "plan-canonical");
      assert.match(await AsyncStorage.getItem(STORAGE_KEY), /plan-canonical/);
    } finally {
      if (previousMode === undefined) delete globalThis.__TEST_STORAGE_MODE__;
      else globalThis.__TEST_STORAGE_MODE__ = previousMode;
    }
  });

  it("AC-02: syncService.upsertCloudPlan removes all leave entries when plan entries array is empty", async () => {
    let deletedAllEntries = false;

    const mockSupabase = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-auto-123" } } } };
        },
      },
      from(table) {
        if (table === "year_plans") {
          return {
            async upsert() {
              return { error: null };
            },
          };
        }
        if (table === "leave_entries") {
          return {
            delete() {
              return {
                eq() {
                  return {
                    async eq() {
                      deletedAllEntries = true;
                      return { error: null };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    setTestSupabase(mockSupabase);
    try {
      const emptyPlan = {
        id: "plan-empty",
        year: "2025",
        createdAt: 1735689600000,
        initialLeave: 26,
        carriedOver: 0,
        csupp: 0,
        publicHolidays: 11,
        entries: [],
      };

      await syncService.upsertCloudPlan(emptyPlan);
      assert.equal(deletedAllEntries, true, "All entries for empty plan must be deleted");
    } finally {
      setTestSupabase(null);
    }
  });

  it("AC-02: syncService.pushToCloud deletes removed plans from Supabase and upserts remaining ones", async () => {
    const deletedPlanIds = [];
    const upsertedPlanIds = [];

    const mockSupabase = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-auto-123" } } } };
        },
      },
      from(table) {
        if (table === "year_plans") {
          return {
            select() {
              return {
                async eq() {
                  // Remote has plan-2023, plan-2024, plan-2025
                  return {
                    data: [{ id: "plan-2023" }, { id: "plan-2024" }, { id: "plan-2025" }],
                    error: null,
                  };
                },
              };
            },
            delete() {
              return {
                eq(c1, planId) {
                  return {
                    async eq() {
                      deletedPlanIds.push(planId);
                      return { error: null };
                    },
                  };
                },
              };
            },
            async upsert(row) {
              upsertedPlanIds.push(row.id);
              return { error: null };
            },
          };
        }
        if (table === "leave_entries") {
          return {
            delete() {
              return {
                eq() {
                  return {
                    async eq() {
                      return { error: null };
                    },
                  };
                },
              };
            },
            select() {
              return {
                eq() {
                  return {
                    async eq() {
                      return { data: [], error: null };
                    },
                  };
                },
              };
            },
            async upsert() {
              return { error: null };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    setTestSupabase(mockSupabase);
    try {
      // Local state: plan-2023 was deleted, only 2024 and 2025 remain
      const remainingPlans = [
        {
          id: "plan-2024",
          year: "2024",
          createdAt: 1704067200000,
          initialLeave: 26,
          carriedOver: 0,
          csupp: 0,
          publicHolidays: 11,
          entries: [],
        },
        {
          id: "plan-2025",
          year: "2025",
          createdAt: 1735689600000,
          initialLeave: 26,
          carriedOver: 0,
          csupp: 0,
          publicHolidays: 11,
          entries: [],
        },
      ];

      await syncService.pushToCloud(remainingPlans);

      assert.deepEqual(deletedPlanIds, ["plan-2023"]);
      assert.deepEqual(upsertedPlanIds, ["plan-2024", "plan-2025"]);
    } finally {
      setTestSupabase(null);
    }
  });

  it("AC-01 / AC-02: syncService.pullFromCloud fetches plans and caches into AsyncStorage", async () => {
    const mockSupabase = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "user-auto-123" } } } };
        },
      },
      from(table) {
        if (table === "year_plans") {
          return {
            select() {
              return {
                eq() {
                  return {
                    async order() {
                      return {
                        data: [
                          {
                            id: "db-plan-2025",
                            user_id: "user-auto-123",
                            year: "2025",
                            initial_leave: 26,
                            carried_over: 2,
                            csupp: 0,
                            public_holidays: 11,
                            created_at: "2025-01-01T00:00:00Z",
                            updated_at: "2025-01-01T00:00:00Z",
                            leave_entries: [
                              {
                                id: "e-remote-1",
                                user_id: "user-auto-123",
                                plan_id: "db-plan-2025",
                                kind: "month",
                                label: "Congés",
                                start_date: null,
                                end_date: null,
                                start_half: null,
                                end_half: null,
                                month: 6,
                                days: 5,
                                created_at: "2025-01-01T00:00:00Z",
                                updated_at: "2025-01-01T00:00:00Z",
                              },
                            ],
                          },
                        ],
                        error: null,
                      };
                    },
                  };
                },
              };
            },
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    setTestSupabase(mockSupabase);
    try {
      const plans = await syncService.pullFromCloud();
      assert.equal(plans.length, 1);
      assert.equal(plans[0].id, "db-plan-2025");
      assert.equal(plans[0].entries.length, 1);
      assert.equal(plans[0].entries[0].id, "e-remote-1");

      const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
      assert.ok(cachedRaw !== null);
      assert.equal(JSON.parse(cachedRaw)[0].id, "db-plan-2025");
    } finally {
      setTestSupabase(null);
    }
  });

  it("AC-02: empty cloud account clears local plans without uploading them", async () => {
    const cachedPlan = {
      id: "unrelated-local-plan", year: "2024", createdAt: 1,
      initialLeave: 25, carriedOver: 0, csupp: 0, publicHolidays: 0, entries: [],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([cachedPlan]));
    let uploadAttempted = false;
    setTestSupabase({
      auth: { async getSession() { return { data: { session: { user: { id: "new-user" } } } }; } },
      from(table) {
        if (table === "year_plans") return {
          select() { return { eq() { return { async order() { return { data: [], error: null }; } }; } }; },
          upsert() { uploadAttempted = true; throw new Error("unexpected upload"); },
        };
        uploadAttempted = true;
        throw new Error(`Unexpected upload table: ${table}`);
      },
    });
    try {
      assert.deepEqual(await syncService.pullFromCloud(), []);
      assert.deepEqual(JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)), []);
      assert.deepEqual(await syncService.pullFromCloud(), []);
      assert.deepEqual(JSON.parse(await AsyncStorage.getItem(STORAGE_KEY)), []);
      assert.equal(uploadAttempted, false);
    } finally {
      setTestSupabase(null);
    }
  });
});

