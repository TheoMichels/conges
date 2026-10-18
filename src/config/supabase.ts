import Constants from "expo-constants";

function resolveConfigValue(...candidates: (unknown | undefined)[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return "";
}

export const supabaseUrl = resolveConfigValue(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  Constants.expoConfig?.extra?.supabaseUrl,
);

export const supabaseAnonKey = resolveConfigValue(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  Constants.expoConfig?.extra?.supabaseAnonKey,
);

export function checkIsSupabaseConfigured(url: string, key: string): boolean {
  if (!url || !key) return false;
  const isHttpUrl = url.startsWith("https://") || url.startsWith("http://");
  if (!isHttpUrl) return false;

  const isPlaceholderUrl =
    url.includes("<ref>") ||
    url.includes("votre-projet") ||
    url.includes("example.com");

  const isPlaceholderKey =
    key.includes("<anon-key>") ||
    key.includes("votre_cle") ||
    key.includes("votre_token");

  return !isPlaceholderUrl && !isPlaceholderKey;
}

export const isSupabaseConfigured = checkIsSupabaseConfigured(
  supabaseUrl,
  supabaseAnonKey,
);
