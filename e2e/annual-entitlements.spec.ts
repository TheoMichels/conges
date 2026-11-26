import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const adminId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";
test("activation par l’admin et consultation après rechargement", async ({ page, context }) => {
  let activated = false;
  let saved = false;
  let override: number | null = null;
  let entries: { id: string; days: number; kind: string; label: string; month: number; user_id: string; plan_id: string; created_at: string; updated_at: string }[] = [];
  let planWrites = 0;
  const setup = async (tab: Page, admin: boolean) => {
    const user = { id: admin ? adminId : memberId, aud: "authenticated", role: "authenticated", email: admin ? "michelstheo1@gmail.com" : "member@example.com" };
    await tab.route("https://holidays.example/**", async route => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `http://127.0.0.1:4174${url.pathname}${url.search}` });
      await route.fulfill({ response });
    });
    await tab.addInitScript(user => localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user })), user);
    await tab.route("https://synthetic.supabase.invalid/**", async route => {
      const url = route.request().url();
      let body: unknown = {};
      if (url.includes("/auth/v1/user")) body = user;
      if (url.includes("/rpc/register_member")) body = [{ active: true, is_admin: admin, display_name: admin ? "admin" : "member" }];
      if (url.includes("/rpc/admin_members")) body = [{ user_id: memberId, email: "member@example.com", display_name: "member", active: true }];
      if (url.includes("/rpc/admin_years")) body = [{ user_id: memberId, email: "member@example.com", display_name: "member", active: true, plan_id: saved ? "annual-plan" : null, year_active: saved ? activated : null, initial_leave: saved ? 26 : null, carried_over: saved ? 2 : null, csupp: saved ? 1 : null, holiday_override: override, automatic_holidays: 2, taken: entries.length ? 1.5 : 0, remaining: saved ? 26 + 2 + 1 + (override ?? 2) - (entries.length ? 1.5 : 0) : null, suggested_carry: 2 }];
      if (url.includes("/rpc/admin_save_year")) { const data = route.request().postDataJSON() as { activate: boolean; holiday: number | null }; saved = true; activated = data.activate; override = data.holiday; }
      if (url.includes("/leave_entries")) {
        if (route.request().method() === "POST") entries = route.request().postDataJSON() as typeof entries;
        if (route.request().method() === "GET") body = entries.map(entry => ({ id: entry.id }));
        else body = [];
      }
      if (url.includes("/year_plans") && route.request().method() !== "GET") planWrites++;
      if (url.includes("/year_plans")) body = !admin && activated ? [{ id: "annual-plan", user_id: memberId, year: "2024", initial_leave: 26, carried_over: 2, csupp: 1, holiday_override: override, public_holidays: 2, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z", leave_entries: entries }] : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, false);
  await page.goto("https://holidays.example/");
  await expect(page.getByTestId("empty-state")).toContainText("Aucune année de congés activée");
  const admin = await context.newPage();
  await setup(admin, true);
  await admin.goto("https://holidays.example/");
  await admin.getByTestId("admin-button").click();
  await admin.getByTestId("annual-year").fill("2024");
  await admin.getByTestId("annual-load").click();
  await admin.getByTestId(`annual-member-${memberId}`).click();
  await admin.getByTestId("annual-initial").fill("26");
  await admin.getByTestId("annual-csupp").fill("1");
  await admin.getByTestId("annual-save").click();
  await expect(admin.getByTestId("annual-notice")).toContainText("enregistrés");
  await page.reload();
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await admin.getByTestId(`annual-member-${memberId}`).click();
  await admin.getByTestId("annual-activate").click();
  await expect(admin.getByTestId("annual-notice")).toContainText("activée");
  await page.reload();
  await expect(page.getByTestId("empty-state")).toHaveCount(0);
  await expect(page.getByText("2024").first()).toBeVisible();
  await expect(page.getByTestId("admin-button")).toHaveCount(0);
  await page.getByTestId("add-leave-button").click();
  await page.getByText("Nombre de jours", { exact: true }).first().click();
  await page.getByPlaceholder("Motif des congés").fill("Privé");
  await page.locator('input[inputmode="decimal"]').last().fill("1,5");
  await page.getByText("Ajouter", { exact: true }).last().click();
  await expect(page.getByTestId("kpi-taken")).toContainText("1,5");
  await expect(page.getByTestId("kpi-remaining")).toContainText("29,5");
  await expect.poll(() => entries.length).toBe(1);
  expect(planWrites).toBe(0);
  await admin.getByTestId("annual-load").click();
  const row = admin.getByTestId(`annual-member-${memberId}`);
  await expect(row).toContainText("29.5");
  await expect(row).not.toContainText("Privé");
  await row.click();
  await admin.getByTestId("annual-holiday").fill("0");
  await admin.getByTestId("annual-save").click();
  await expect(row).toContainText("27.5");
  await page.reload();
  await expect(page.getByTestId("kpi-remaining")).toContainText("27,5");
  await row.click();
  await admin.getByTestId("annual-auto").click();
  await admin.getByTestId("annual-save").click();
  await expect(row).toContainText("29.5");
  await page.reload();
  await expect(page.getByTestId("kpi-remaining")).toContainText("29,5");
  await expect(page.getByText("Privé")).toBeVisible();
  await admin.close();
});
