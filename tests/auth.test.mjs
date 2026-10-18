import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
import { pathToFileURL } from "node:url";

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

const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;

const { credentialsSchema, translateAuthError } = await import(
  "../src/services/authService.ts"
);
const { checkIsSupabaseConfigured } = await import(
  "../src/config/supabase.ts"
);
const { clearLocalCache } = await import(
  "../src/services/syncService.ts"
);

describe("Lot 5 — Auth Validation & Translations (AC-03)", () => {
  it("validates valid credentials successfully", () => {
    const valid = credentialsSchema.safeParse({
      email: "user@example.com",
      password: "secretpassword",
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.email, "user@example.com");
      assert.equal(valid.data.password, "secretpassword");
    }
  });

  it("trims whitespace around valid email", () => {
    const valid = credentialsSchema.safeParse({
      email: "  hello@domain.com  ",
      password: "secretpassword",
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.email, "hello@domain.com");
    }
  });

  it("fails with French message on invalid email", () => {
    const result = credentialsSchema.safeParse({
      email: "invalid-email-address",
      password: "secretpassword",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? "", /valide/i);
    }
  });

  it("fails with French message on short password (< 6 chars)", () => {
    const result = credentialsSchema.safeParse({
      email: "user@example.com",
      password: "123",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0]?.message ?? "", /au moins 6 caractères/i);
    }
  });

  it("translates Supabase errors into user-friendly French messages", () => {
    assert.equal(
      translateAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }),
      "Adresse e-mail ou mot de passe incorrect."
    );
    assert.equal(
      translateAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }),
      "Confirmez votre adresse e-mail avant de vous connecter."
    );
    assert.equal(
      translateAuthError({ code: "user_already_exists", message: "User already registered" }),
      "Un compte existe déjà avec cette adresse e-mail."
    );
    assert.equal(
      translateAuthError({ code: "weak_password", message: "Password should be at least 6 characters" }),
      "Choisissez un mot de passe plus robuste."
    );
    assert.equal(
      translateAuthError({ code: "over_email_send_rate_limit", message: "Rate limit exceeded" }),
      "Trop de tentatives. Patientez quelques instants puis réessayez."
    );
    assert.equal(
      translateAuthError({ message: "Failed to fetch" }),
      "Connexion au serveur impossible. Vérifiez votre connexion réseau puis réessayez."
    );
  });
});

describe("Lot 5 — Supabase Configuration Check (AC-02)", () => {
  it("detects valid Supabase configuration", () => {
    assert.equal(
      checkIsSupabaseConfigured("https://my-ref.supabase.co", "valid-anon-key-123"),
      true
    );
    assert.equal(
      checkIsSupabaseConfigured("https://synthetic.supabase.invalid", "fake-anon-key"),
      true
    );
  });

  it("rejects missing, empty, or placeholder configurations", () => {
    assert.equal(checkIsSupabaseConfigured("", "some-key"), false);
    assert.equal(checkIsSupabaseConfigured("https://my-ref.supabase.co", ""), false);
    assert.equal(checkIsSupabaseConfigured("not-a-url", "some-key"), false);
    assert.equal(checkIsSupabaseConfigured("https://<ref>.supabase.co", "key"), false);
    assert.equal(checkIsSupabaseConfigured("https://votre-projet.supabase.co", "key"), false);
    assert.equal(checkIsSupabaseConfigured("https://valid.supabase.co", "<anon-key>"), false);
  });
});

describe("Lot 5 — Clear Local Cache (AC-04 / AC-05)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("removes all @holy_* and @holidays_* keys from AsyncStorage while preserving third-party keys", async () => {
    await AsyncStorage.setItem("@holy_year_plans_v1", JSON.stringify([{ id: "1" }]));
    await AsyncStorage.setItem("@holy_draft_cache", "draft");
    await AsyncStorage.setItem("@holidays_year_plans_v1", JSON.stringify([{ id: "legacy" }]));
    await AsyncStorage.setItem("@holidays_draft_cache", "legacy-draft");
    await AsyncStorage.setItem("sb-synthetic-auth-token", "jwt-token");
    await AsyncStorage.setItem("user-theme-preference", "dark");

    await clearLocalCache();

    const remainingKeys = await AsyncStorage.getAllKeys();
    assert.equal(remainingKeys.includes("@holy_year_plans_v1"), false);
    assert.equal(remainingKeys.includes("@holy_draft_cache"), false);
    assert.equal(remainingKeys.includes("@holidays_year_plans_v1"), false);
    assert.equal(remainingKeys.includes("@holidays_draft_cache"), false);
    assert.equal(remainingKeys.includes("sb-synthetic-auth-token"), true);
    assert.equal(remainingKeys.includes("user-theme-preference"), true);
  });

  it("also purges @holy_* and @holidays_* keys from window.localStorage when in web environment", async () => {
    const mockLocalStorage = new Map();
    mockLocalStorage.set("@holy_year_plans_v1", "data");
    mockLocalStorage.set("@holy_state", "state");
    mockLocalStorage.set("@holidays_year_plans_v1", "legacy-data");
    mockLocalStorage.set("@holidays_state", "legacy-state");
    mockLocalStorage.set("sb-synthetic-auth-token", "token");
    mockLocalStorage.set("other_service_key", "val");

    globalThis.window = {
      localStorage: {
        get length() {
          return mockLocalStorage.size;
        },
        key(index) {
          return Array.from(mockLocalStorage.keys())[index] ?? null;
        },
        getItem(k) {
          return mockLocalStorage.get(k) ?? null;
        },
        setItem(k, v) {
          mockLocalStorage.set(k, String(v));
        },
        removeItem(k) {
          mockLocalStorage.delete(k);
        },
      },
    };

    try {
      await clearLocalCache();

      assert.equal(mockLocalStorage.has("@holy_year_plans_v1"), false);
      assert.equal(mockLocalStorage.has("@holy_state"), false);
      assert.equal(mockLocalStorage.has("@holidays_year_plans_v1"), false);
      assert.equal(mockLocalStorage.has("@holidays_state"), false);
      assert.equal(mockLocalStorage.has("sb-synthetic-auth-token"), true);
      assert.equal(mockLocalStorage.has("other_service_key"), true);
    } finally {
      delete globalThis.window;
    }
  });
});
