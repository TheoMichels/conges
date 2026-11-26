import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const adminId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";
async function setup(page: Page, admin: boolean) {
  const user = { id: admin ? adminId : memberId, aud: "authenticated", role: "authenticated", email: admin ? "michelstheo1@gmail.com" : "member@example.com" };
  let active = true;
  let name = "member";
  await page.route("https://holidays.example/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === "/administration" ? "/" : url.pathname;
    const response = await route.fetch({ url: `http://127.0.0.1:4174${path}${url.search}` });
    await route.fulfill({ response });
  });
  await page.addInitScript(user => localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user })), user);
  await page.route("https://synthetic.supabase.invalid/**", async route => {
    const url = route.request().url();
    let body: unknown = {};
    if (url.includes("/auth/v1/user")) body = user;
    if (url.includes("/rpc/register_member")) body = [{ active: true, is_admin: admin, display_name: name }];
    if (url.includes("/rpc/admin_members")) body = [{ user_id: memberId, email: "member@example.com", display_name: name, active }, { user_id: adminId, email: "michelstheo1@gmail.com", display_name: "admin", active: true }];
    if (url.includes("/rpc/admin_set_active")) { const payload = route.request().postDataJSON() as { enabled: boolean }; active = payload.enabled; }
    if (url.includes("/rpc/set_display_name")) { const payload = route.request().postDataJSON() as { value: string }; name = payload.value; }
    if (url.includes("/year_plans")) body = [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("administrateur : liste, désactivation et réactivation", async ({ page }) => {
  await setup(page, true);
  await page.goto("https://holidays.example/");
  await page.getByTestId("admin-button").click();
  await expect(page.getByTestId("administration-screen")).toBeVisible();
  const member = page.getByTestId(`member-${memberId}`);
  await member.getByText("Désactiver").click();
  await expect(member).toContainText("Désactivé");
  await member.getByText("Réactiver").click();
  await expect(member).toContainText("Actif");
  await page.reload();
  await expect(page.getByTestId("administration-screen")).toBeVisible();
  await expect(page.getByTestId(`member-${memberId}`)).toContainText("Actif");
});

test("membre : profil modifiable et administration refusée par URL", async ({ page }) => {
  await setup(page, false);
  await page.goto("https://holidays.example/");
  await expect(page.getByTestId("admin-button")).toHaveCount(0);
  await page.getByTestId("profile-button").click();
  await page.getByTestId("display-name-input").fill("michelstheo1@gmail.com");
  await page.getByTestId("save-display-name").click();
  await expect(page.getByTestId("company-notice")).toBeVisible();
  await page.goto("https://holidays.example/administration");
  await expect(page.getByTestId("access-denied")).toBeVisible();
});

test("visiteur : inscription puis connexion et reconnexion", async ({ page }) => {
  const user = { id: memberId, aud: "authenticated", role: "authenticated", email: "member@example.com" };
  let registrations = 0;
  await page.route("https://holidays.example/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === "/administration" ? "/" : url.pathname;
    const response = await route.fetch({ url: `http://127.0.0.1:4174${path}${url.search}` });
    await route.fulfill({ response });
  });
  await page.route("https://synthetic.supabase.invalid/**", async route => {
    const url = route.request().url();
    let body: unknown = {};
    if (url.includes("/auth/v1/signup")) body = user;
    if (url.includes("/auth/v1/token")) body = { access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_in: 3600, user };
    if (url.includes("/auth/v1/user")) body = user;
    if (url.includes("/rpc/register_member")) { registrations++; body = [{ active: true, is_admin: false, display_name: "member" }]; }
    if (url.includes("/year_plans")) body = [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("https://holidays.example/administration");
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await page.getByTestId("auth-mode-toggle").click();
  await page.getByTestId("auth-email-input").fill("member@example.com");
  await page.getByTestId("auth-password-input").fill("valid-password");
  await page.getByTestId("auth-submit-button").click();
  await expect(page.getByTestId("auth-success-banner")).toBeVisible();
  await page.getByTestId("auth-mode-toggle").click();
  await page.getByTestId("auth-submit-button").click();
  await expect(page.getByTestId("access-denied")).toBeVisible();
  await page.getByTestId("company-close").click();
  await expect(page.getByTestId("app-header")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("app-header")).toBeVisible();
  expect(registrations).toBeGreaterThanOrEqual(1);
});

test("désactivation pendant le chargement : accès refusé et données locales conservées", async ({ page }) => {
  const user = { id: memberId, aud: "authenticated", role: "authenticated", email: "member@example.com" };
  let checks = 0;
  await page.route("https://holidays.example/**", async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4174${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  await page.addInitScript(user => {
    localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user }));
    localStorage.setItem("@holy_year_plans_v1", '[{"id":"local-plan"}]');
  }, user);
  await page.route("https://synthetic.supabase.invalid/**", async route => {
    const url = route.request().url();
    let body: unknown = {};
    if (url.includes("/auth/v1/user")) body = user;
    if (url.includes("/rpc/register_member")) body = [{ active: ++checks === 1, is_admin: false, display_name: "member" }];
    if (url.includes("/year_plans")) body = [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("https://holidays.example/");
  await expect(page.getByTestId("account-error")).toContainText("désactivé");
  await expect(page.getByTestId("app-header")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("@holy_year_plans_v1"))).toBe('[{"id":"local-plan"}]');
});
