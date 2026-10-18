import { createClient, SupabaseClient, SupportedStorage } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { isLocalMode } from "../config/storageMode";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "../config/supabase";
import { Database } from "../types/database";

export const hybridAuthStorage: SupportedStorage = {
  getItem(key: string): string | null | Promise<string | null> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          return item;
        }
      } catch {
        // Ignorer les erreurs de lecture localStorage
      }
      return AsyncStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },

  setItem(key: string, value: string): void | Promise<void> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignorer les erreurs de quota ou accès restreint
      }
      AsyncStorage.setItem(key, value).catch(() => {});
      return;
    }
    return AsyncStorage.setItem(key, value);
  },

  removeItem(key: string): void | Promise<void> {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignorer les erreurs localStorage
      }
      AsyncStorage.removeItem(key).catch(() => {});
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient<Database, "holidays"> | null =
  !isLocalMode && isSupabaseConfigured
    ? createClient<Database, "holidays">(supabaseUrl, supabaseAnonKey, {
        db: { schema: "holidays" },
        auth: {
          storage: hybridAuthStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === "web",
        },
      })
    : null;
