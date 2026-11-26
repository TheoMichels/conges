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

const { setTestSupabase } = await import("virtual:supabase-client");
const { syncService } = await import("../src/services/syncService.ts");
const exception = { id:"old", kind:"month", label:"Exception", month:1, days:1.2, createdAt:0 };
const plan = { id:"p", year:"2026", createdAt:0, initialLeave:26, carriedOver:0, csupp:0, publicHolidays:0, holidayOverride:null, entries:[exception] };
function client(remote) {
  const calls = [];
  return { calls, from(table) {
    let operation = "select";
    const query = { select() { return query; }, eq() { return query; }, in(_, ids) { calls.push(["delete-ids",ids]); return Promise.resolve({error:null}); },
      async single() { return { data:{id:"p"},error:null }; }, async maybeSingle() { return {data:{id:"p"},error:null}; },
      upsert(rows) { calls.push([table,"upsert",rows]); operation="upsert"; return query; },
      update(row) { calls.push([table,"update",row]); operation="update"; return query; },
      delete() { calls.push([table,"delete"]); operation="delete"; return query; },
      then(resolve) { resolve({data:operation === "select" ? remote : null,error:null}); }
    }; return query;
  } };
}

describe("F04 cloud save preserves historical exceptions", () => {
  it("never upserts or deletes a matching exception", async () => {
    const mock = client([{id:"old",kind:"month",label:"Exception",month:1,days:1.2}]); setTestSupabase(mock);
    try { await syncService.upsertCloudPlan(plan,"u");
      assert.equal(mock.calls.some(c => c[0] === "leave_entries" && c[1] === "upsert"),false);
      assert.equal(mock.calls.some(c => c[0] === "delete-ids" && c[1].includes("old")),false);
    } finally { setTestSupabase(null); }
  });
  it("rejects an unknown monthly exception before any write", async () => {
    const mock = client([]); setTestSupabase(mock);
    try { await assert.rejects(syncService.upsertCloudPlan(plan,"u"), /exception|mensuel/i);
      assert.deepEqual(mock.calls,[]);
    } finally { setTestSupabase(null); }
  });
  it("rejects a local exception before deleting or writing any cloud plan", async () => {
    const mock = client([]); setTestSupabase(mock);
    try { await assert.rejects(syncService.pushToCloud([plan],"u"), /exception|mensuel/i);
      assert.deepEqual(mock.calls,[]);
    } finally { setTestSupabase(null); }
  });
  it("rejects invalid dates before changing plan metadata", async () => {
    const mock = client([]); setTestSupabase(mock);
    const invalid = {...plan, entries:[{id:"bad",kind:"dates",label:"x",createdAt:0,startDate:"2026-02-30",endDate:"2026-02-30"}]};
    try { await assert.rejects(syncService.upsertCloudPlan(invalid,"u"));
      assert.deepEqual(mock.calls,[]);
    } finally { setTestSupabase(null); }
  });
  it("never deletes entries separately before deleting their parent plan", async () => {
    const mock = client([]); setTestSupabase(mock);
    try { await syncService.deleteCloudPlan("p","u");
      assert.equal(mock.calls.some(c => c[0] === "leave_entries" && c[1] === "delete"),false);
      assert.equal(mock.calls.some(c => c[0] === "year_plans" && c[1] === "delete"),true);
    } finally { setTestSupabase(null); }
  });
  it("does not delete a remote exception omitted from a stale snapshot", async () => {
    const mock = client([{id:"old",kind:"month",label:"Exception",month:1,days:1.2}]); setTestSupabase(mock);
    try { await syncService.upsertCloudPlan({...plan,entries:[]},"u");
      assert.equal(mock.calls.some(c => c[0] === "delete-ids" && c[1].includes("old")),false);
      assert.equal(mock.calls.some(c => c[0] === "leave_entries" && c[1] === "delete"),false);
    } finally { setTestSupabase(null); }
  });
});
