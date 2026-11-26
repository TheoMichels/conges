import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { isLocalMode } from "../config/storageMode";
import { LEGACY_CONGES_KEY, LEGACY_STORAGE_KEY, STORAGE_KEY, readRawKey } from "./localStorage";

const MARKER = "@holy_storage_isolation_v2";
const QUARANTINE = "@holy_legacy_quarantine_v1";
const keys = [STORAGE_KEY, LEGACY_STORAGE_KEY, LEGACY_CONGES_KEY] as const;
const schema = z.object({ values: z.record(z.string(), z.string()), restored: z.boolean() });
type Quarantine = z.infer<typeof schema>;

export async function getLegacyQuarantine(): Promise<Quarantine | null> {
  const raw = await AsyncStorage.getItem(QUARANTINE);
  if (!raw) return null;
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success || Object.keys(parsed.data.values).some(key => !keys.includes(key as typeof keys[number]))) throw new Error("Impossible de lire les données conservées.");
  return parsed.data;
}

export async function migrateLegacyStorage(): Promise<void> {
  if (await AsyncStorage.getItem(MARKER)) return;
  let saved = await getLegacyQuarantine();
  if (!saved) {
    const values: Record<string, string> = {};
    for (const key of keys) {
      const value = await readRawKey(key);
      if (value !== null) values[key] = value;
    }
    if (Object.keys(values).length) {
      saved = { values, restored: false };
      await AsyncStorage.setItem(QUARANTINE, JSON.stringify(saved));
    }
  }
  if (saved) {
    for (const key of keys) {
      const current = await readRawKey(key);
      if (current !== null && current !== saved.values[key]) throw new Error("Les données existantes ont changé pendant la migration.");
    }
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    }
  }
  await AsyncStorage.setItem(MARKER, "1");
}

export async function restoreLegacyStorage(): Promise<void> {
  if (!isLocalMode) throw new Error("La récupération est réservée à l’espace local.");
  const saved = await getLegacyQuarantine();
  if (!saved || saved.restored) throw new Error("Aucune donnée à récupérer.");
  for (const key of keys) {
    if (await readRawKey(key) !== null) throw new Error("Des données locales existent déjà ; elles ne peuvent pas être remplacées.");
  }
  for (const [key, value] of Object.entries(saved.values)) await AsyncStorage.setItem(key, value);
  await AsyncStorage.setItem(QUARANTINE, JSON.stringify({ ...saved, restored: true }));
}
