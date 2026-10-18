import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const stateDir = path.join(rootDir, ".agents", "state", "test-builds");

fs.mkdirSync(stateDir, { recursive: true });

const builds = [
  {
    name: "local",
    outDir: path.join(stateDir, "local"),
    env: {
      ...process.env,
      VERCEL: "",
      VERCEL_ENV: "",
      EXPO_PUBLIC_SUPABASE_URL: "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
  {
    name: "cloud",
    outDir: path.join(stateDir, "cloud"),
    env: {
      ...process.env,
      VERCEL: "1",
      VERCEL_ENV: "production",
      EXPO_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.invalid",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon-key-valid-token-123456",
    },
  },
  {
    name: "cloud-unconfigured",
    outDir: path.join(stateDir, "cloud-unconfigured"),
    env: {
      ...process.env,
      VERCEL: "1",
      VERCEL_ENV: "production",
      EXPO_PUBLIC_SUPABASE_URL: "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
];

for (const build of builds) {
  console.log(`[prepare-test-builds] Génération du build ${build.name}...`);
  fs.rmSync(build.outDir, { recursive: true, force: true });
  execSync(`npx expo export -p web --output-dir "${build.outDir}" --clear`, {
    stdio: "inherit",
    env: build.env,
  });
}

// Assurer la présence de dist/ pour preview local si besoin
const distDir = path.join(rootDir, "dist");
fs.cpSync(path.join(stateDir, "local"), distDir, { recursive: true });

console.log("[prepare-test-builds] Tous les builds ont été générés avec succès.");
