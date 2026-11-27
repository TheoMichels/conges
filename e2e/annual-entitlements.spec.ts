import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const adminId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";
const otherMemberId = "00000000-0000-4000-8000-000000000003";
test("activation par l’admin et consultation après rechargement", async ({ page, context }) => {
  let activated = false;
  let failActivatedCatalog = true;
  let saved = false;
  let override: number | null = null;
  let initial = 26;
  let carried = 2;
  let releaseEntry!: () => void;
  let markEntryStarted!: () => void;
  const entryStarted = new Promise<void>(resolve => { markEntryStarted = resolve; });
  const entryGate = new Promise<void>(resolve => { releaseEntry = resolve; });
  let entries: { id: string; days: number; kind: string; label: string; month: number; user_id: string; plan_id: string; created_at: string; updated_at: string }[] = [];
  let planWrites = 0;
  const setup = async (tab: Page, admin: boolean) => {
    const user = { id: admin ? adminId : memberId, aud: "authenticated", role: "authenticated", email: admin ? "michelstheo1@gmail.com" : "member@example.com" };
    await tab.route("https://holidays.example/**", async route => {
      const url = new URL(route.request().url());
      const path = url.pathname === "/administration" ? "/" : url.pathname;
      const response = await route.fetch({ url: `http://127.0.0.1:4174${path}${url.search}` });
      await route.fulfill({ response });
    });
    await tab.addInitScript(user => localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user })), user);
    await tab.route("https://synthetic.supabase.invalid/**", async route => {
      const url = route.request().url();
      let body: unknown = {};
      if (url.includes("/auth/v1/user")) body = user;
      if (url.includes("/rpc/register_member")) body = [{ active: true, is_admin: admin, display_name: admin ? "admin" : "member" }];
      if (url.includes("/rpc/admin_members")) body = [{ user_id: memberId, email: "member@example.com", display_name: "member", active: true }];
      if (url.includes("/rpc/admin_year_catalog")) {
        if (activated && failActivatedCatalog) { failActivatedCatalog = false; body = {}; }
        else body = saved ? [{ year: "2024", has_active: activated }] : [];
      }
      if (url.includes("/rpc/admin_years")) body = [
        { user_id: memberId, email: "member@example.com", display_name: "Alex Member", active: true, plan_id: saved ? "annual-plan" : null, year_active: saved ? activated : null, initial_leave: saved ? initial : null, carried_over: saved ? carried : null, csupp: saved ? 1 : null, holiday_override: override, automatic_holidays: 2, taken: entries.length ? 1.5 : 0, remaining: saved ? initial + carried + 1 + (override ?? 2) - (entries.length ? 1.5 : 0) : null, suggested_carry: 2 },
        { user_id: otherMemberId, email: "robin@example.com", display_name: "Robin Example", active: true, plan_id: "robin-plan", year_active: true, initial_leave: 0, carried_over: 0, csupp: 0, holiday_override: null, automatic_holidays: 2, taken: 0, remaining: -1, suggested_carry: 1 },
      ];
      if (url.includes("/rpc/admin_save_year")) { const data = route.request().postDataJSON() as { activate: boolean; holiday: number | null; initial: number; carried: number }; saved = true; activated = data.activate; override = data.holiday; initial = data.initial; carried = data.carried; }
      if (url.includes("/leave_entries")) {
        if (route.request().method() === "POST") { markEntryStarted(); await entryGate; entries = route.request().postDataJSON() as typeof entries; }
        if (route.request().method() === "GET") body = entries.map(entry => ({ id: entry.id }));
        else body = [];
      }
      if (url.includes("/year_plans") && route.request().method() !== "GET") planWrites++;
      if (url.includes("/year_plans")) body = !admin && activated ? [{ id: "annual-plan", user_id: memberId, year: "2024", initial_leave: initial, carried_over: carried, csupp: 1, holiday_override: override, public_holidays: 2, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z", leave_entries: entries }] : [];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, false);
  await page.goto("https://holidays.example/");
  await expect(page.getByTestId("empty-state")).toContainText("Aucune année de congés activée");
  const admin = await context.newPage();
  await admin.setViewportSize({ width: 390, height: 844 });
  await setup(admin, true);
  await admin.goto("https://holidays.example/");
  await admin.getByTestId("admin-button").click();
  await expect(admin.getByTestId("annual-empty")).toBeVisible();
  await admin.getByTestId("annual-create-button").click();
  await admin.getByTestId("annual-year").fill("1800");
  await admin.getByTestId("annual-load").click();
  await expect(admin.getByTestId("annual-error")).toContainText("année valide");
  await admin.getByTestId("annual-year").fill("2024");
  await admin.getByTestId("annual-load").click();
  await expect(admin.getByTestId(`annual-member-${otherMemberId}`)).toBeVisible();
  await expect(admin.getByTestId(`annual-member-${otherMemberId}`)).not.toContainText("robin@example.com");
  await expect(admin.getByTestId(`annual-remaining-${otherMemberId}`)).toHaveCSS("color", "rgb(220, 38, 38)");
  await admin.getByTestId("member-search").fill("robin");
  await expect(admin.getByTestId(`annual-member-${otherMemberId}`)).toBeVisible();
  await expect(admin.getByTestId(`annual-member-${memberId}`)).toHaveCount(0);
  await admin.getByTestId("member-search").fill("personne-inconnue");
  await expect(admin.getByTestId("annual-members-empty")).toContainText("Aucun membre trouvé");
  await expect(admin.getByTestId("members-empty")).toBeVisible();
  await admin.getByTestId("member-search").fill("");
  await admin.setViewportSize({ width: 1600, height: 1000 });
  const wideRow = admin.getByTestId(`annual-member-${memberId}`);
  const rowPositions = await Promise.all(["identity", "fields", "actions"].map(group => admin.getByTestId(`annual-${group}-${memberId}`).evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return { center: bounds.y + bounds.height / 2, left: bounds.left, right: bounds.right };
  })));
  console.log("annual row group bounds", rowPositions);
  const centers = rowPositions.map(position => position.center);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
  expect(rowPositions[0].right).toBeLessThanOrEqual(rowPositions[1].left);
  expect(rowPositions[1].right).toBeLessThanOrEqual(rowPositions[2].left);
  const rowBounds = await wideRow.boundingBox();
  expect(rowPositions[2].right).toBeLessThanOrEqual((rowBounds?.x ?? 0) + (rowBounds?.width ?? 0));
  await admin.getByTestId(`annual-initial-${memberId}`).fill("26");
  await admin.getByTestId(`annual-csupp-${memberId}`).fill("1");
  await admin.getByTestId(`annual-carried-${memberId}`).fill("3");
  await admin.getByTestId(`annual-initial-${memberId}`).fill("1,234");
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect(admin.getByTestId(`annual-row-error-${memberId}`)).toBeVisible();
  await admin.getByTestId(`annual-initial-${memberId}`).fill("26");
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect(admin.getByTestId("annual-notice")).toContainText("enregistrés");
  for (const testId of ["fields", "auto", "save"]) {
    const memberBounds = await admin.getByTestId(`annual-${testId}-${memberId}`).boundingBox();
    const activeBounds = await admin.getByTestId(`annual-${testId}-${otherMemberId}`).boundingBox();
    expect(memberBounds).not.toBeNull();
    expect(activeBounds).not.toBeNull();
    expect(Math.abs(memberBounds!.x - activeBounds!.x)).toBeLessThan(2);
    expect(Math.abs(memberBounds!.width - activeBounds!.width)).toBeLessThan(2);
  }
  await page.reload();
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await admin.reload();
  await expect(admin.getByTestId("annual-empty")).toBeVisible();
  await admin.getByTestId("annual-create-button").click();
  await admin.getByTestId("annual-year").fill("2024");
  await admin.getByTestId("annual-load").click();
  await expect(admin.getByTestId("annual-notice")).toContainText("Brouillon existant");
  await expect(admin.getByTestId(`annual-carried-${memberId}`)).toHaveValue("3");
  await admin.getByTestId(`annual-carried-${memberId}`).fill("2");
  await admin.getByTestId(`annual-activate-${memberId}`).click();
  await expect(admin.getByTestId("annual-notice")).toContainText("activée");
  await expect(admin.getByTestId("annual-error")).toBeVisible();
  await expect(admin.getByTestId("annual-year-2024")).toHaveCount(0);
  await admin.getByTestId("annual-retry").click();
  await expect(admin.getByTestId("annual-year-2024")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("empty-state")).toHaveCount(0);
  await expect(page.getByText("2024").first()).toBeVisible();
  await expect(page.getByTestId("admin-button")).toHaveCount(0);
  await page.getByTestId("add-leave-button").click();
  await page.getByPlaceholder("Motif des congés").fill("Privé");
  await page.getByTestId("calendar-day-2024-01-02").click();
  await page.getByTestId("calendar-day-2024-01-02").click();
  await page.getByTestId("calendar-day-2024-01-03").click();
  await page.getByText("Jusqu'au midi (-0,5 j)").click();
  await page.getByText("Ajouter", { exact: true }).last().click();
  await expect(page.getByTestId("kpi-taken")).toContainText("1,5");
  await expect(page.getByTestId("kpi-remaining")).toContainText("29,5");
  await entryStarted;
  await admin.getByTestId(`annual-initial-${memberId}`).fill("30");
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect.poll(() => initial).toBe(30);
  releaseEntry();
  await expect.poll(() => entries.length).toBe(1);
  await page.reload();
  await expect(page.getByTestId("kpi-remaining")).toContainText("33,5");
  await admin.getByTestId(`annual-initial-${memberId}`).fill("26");
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect.poll(() => initial).toBe(26);
  expect(planWrites).toBe(0);
  await admin.reload();
  await expect(admin.getByTestId("annual-year-2024")).toBeVisible();
  await admin.getByTestId("annual-create-button").click();
  await admin.getByTestId("annual-year").fill("2024");
  await admin.getByTestId("annual-load").click();
  await expect(admin.getByTestId("annual-error")).toContainText("existe déjà");
  const row = admin.getByTestId(`annual-member-${memberId}`);
  await expect(row).toContainText("29.5");
  await expect(row).not.toContainText("member@example.com");
  await expect(admin.getByTestId(`annual-remaining-${memberId}`)).toHaveCSS("color", "rgb(31, 78, 121)");
  await expect(row).not.toContainText("Privé");
  await admin.getByTestId(`annual-holiday-${memberId}`).fill("0");
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect(row).toContainText("27.5");
  await page.reload();
  await expect(page.getByTestId("kpi-remaining")).toContainText("27,5");
  await admin.getByTestId(`annual-auto-${memberId}`).click();
  await admin.getByTestId(`annual-save-${memberId}`).click();
  await expect(row).toContainText("29.5");
  await page.reload();
  await expect(page.getByTestId("kpi-remaining")).toContainText("29,5");
  await expect(page.getByText("Privé")).toBeVisible();
  await admin.close();
});

test("une sauvegarde tardive ne remplace pas les droits de l’année sélectionnée", async ({ page }) => {
  const user = { id: adminId, aud: "authenticated", role: "authenticated", email: "michelstheo1@gmail.com" };
  let releaseSave!: () => void;
  let markSaveStarted!: () => void;
  const gate = new Promise<void>(resolve => { releaseSave = resolve; });
  const started = new Promise<void>(resolve => { markSaveStarted = resolve; });
  const writes: string[] = [];
  let releaseCatalog!: () => void;
  const catalogGate = new Promise<void>(resolve => { releaseCatalog = resolve; });
  let firstCatalog = true;
  let failYearLoad = true;
  await page.route("https://holidays.example/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === "/administration" ? "/" : url.pathname;
    await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:4174${path}${url.search}` }) });
  });
  await page.addInitScript(user => localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now() / 1000) + 3600, user })), user);
  await page.route("https://synthetic.supabase.invalid/**", async route => {
    const url = route.request().url();
    let body: unknown = {};
    if (url.includes("/auth/v1/user")) body = user;
    if (url.includes("/rpc/register_member")) body = [{ active: true, is_admin: true, display_name: "admin" }];
    if (url.includes("/rpc/admin_members")) body = [];
    if (url.includes("/rpc/admin_year_catalog")) {
      if (firstCatalog) { firstCatalog = false; await catalogGate; }
      body = [{ year: "2025", has_active: true }, { year: "2024", has_active: true }];
    }
    if (url.includes("/rpc/admin_years")) {
      const { target_year } = route.request().postDataJSON() as { target_year: string };
      if (target_year === "2024" && failYearLoad) { failYearLoad = false; await route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); return; }
      body = [{ user_id: memberId, email: "member@example.com", display_name: "member", active: true, plan_id: `plan-${target_year}`, year_active: true, initial_leave: target_year === "2024" ? 24 : 40, carried_over: 0, csupp: 0, holiday_override: null, automatic_holidays: 2, taken: 0, remaining: target_year === "2024" ? 26 : 42, suggested_carry: 0 }];
    }
    if (url.includes("/rpc/admin_save_year")) {
      const { target_year } = route.request().postDataJSON() as { target_year: string };
      writes.push(target_year);
      if (target_year === "2024") { markSaveStarted(); await gate; }
    }
    if (url.includes("/year_plans")) body = [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("https://holidays.example/");
  await page.getByTestId("admin-button").click();
  await expect(page.getByTestId("annual-entitlements").getByTestId("loading-skeleton")).toBeVisible();
  await expect(page.getByTestId("annual-year-menu")).toHaveCount(0);
  releaseCatalog();
  await expect(page.getByTestId("annual-year-2024")).toBeVisible();
  await page.getByTestId("annual-year-2024").click();
  await expect(page.getByTestId("annual-error")).toBeVisible();
  await page.getByTestId("annual-retry").click();
  await expect(page.getByTestId(`annual-initial-${memberId}`)).toHaveValue("24");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByTestId(`annual-save-${memberId}`).click();
  await started;
  await page.getByTestId("annual-year-2025").click();
  await expect(page.getByTestId(`annual-initial-${memberId}`)).toHaveValue("40");
  const response = page.waitForResponse(response => response.url().includes("/rpc/admin_save_year"));
  releaseSave();
  await response;
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId(`annual-initial-${memberId}`)).toHaveValue("40");
  await expect(page.getByTestId(`annual-member-${memberId}`)).toContainText("Restant : 42");
  await page.getByTestId(`annual-save-${memberId}`).click();
  await expect.poll(() => writes).toEqual(["2024", "2025"]);
});
