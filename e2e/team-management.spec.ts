import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

const adminId = "00000000-0000-4000-8000-000000000001";
const memberId = "00000000-0000-4000-8000-000000000002";
const alpha = "00000000-0000-4000-8000-000000000011";
const beta = "00000000-0000-4000-8000-000000000012";
async function setup(page: Page, failRefresh = false) {
 let saved = false;
 const user = { id: adminId, aud: "authenticated", role: "authenticated", email: "michelstheo1@gmail.com" };
 const teams: { id: string; name: string; archived: boolean }[] = [];
 const assignments: { team_id: string; user_id: string }[] = [];
 await page.route("https://holidays.example/**", async route => { const url = new URL(route.request().url()); const path = url.pathname === "/administration" ? "/" : url.pathname; await route.fulfill({ response: await route.fetch({ url: `http://127.0.0.1:4174${path}${url.search}` }) }); });
 await page.addInitScript(user => localStorage.setItem("sb-synthetic-auth-token", JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer", expires_at: Math.floor(Date.now()/1000)+3600, user })), user);
 await page.route("https://synthetic.supabase.invalid/**", async route => {
  const url = route.request().url(); let body: unknown = {};
  const payload = route.request().postDataJSON() as Record<string, string | boolean | null> | null;
  if (url.includes("/auth/v1/user")) body = user;
  if (url.includes("/rpc/register_member")) body = [{ active: true, is_admin: true, display_name: "admin" }];
  if (url.includes("/rpc/admin_members")) body = [{ user_id: memberId, email: "member@example.com", display_name: "Alex", active: true }];
  if (url.includes("/rpc/admin_year_catalog")) body = [];
  if (url.includes("/rpc/admin_teams") && failRefresh && saved) { await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ invalid: true }) }); return; }
  if (url.includes("/rpc/admin_teams")) body = teams;
  if (url.includes("/rpc/admin_team_members")) body = assignments;
  if (url.includes("/rpc/admin_save_team")) { saved = true; const target = payload?.target; const name = String(payload?.value); const existing = teams.find(t => t.id === target); if (existing) existing.name = name; else teams.push({ id: teams.length ? beta : alpha, name, archived: false }); }
  if (url.includes("/rpc/admin_archive_team")) { const team = teams.find(t => t.id === payload?.target); if (team) team.archived = true; }
  if (url.includes("/rpc/admin_set_team_member")) { const i = assignments.findIndex(a => a.team_id === payload?.target && a.user_id === payload?.member); if (payload?.assigned && i < 0) assignments.push({ team_id: String(payload.target), user_id: String(payload.member) }); if (!payload?.assigned && i >= 0) assignments.splice(i, 1); }
  if (url.includes("/year_plans")) body = [];
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
 });
}
test("AC-13 et AC-14 : équipes, affectations et archives persistent", async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 }); await setup(page); await page.goto("https://holidays.example/");
 await page.getByTestId("admin-button").click();
 await page.getByTestId("team-name").fill("Alpha"); await page.getByTestId("team-save").click();
 await expect(page.getByTestId(`team-${alpha}`)).toBeVisible();
 await page.getByTestId("team-name").fill("Beta"); await page.getByTestId("team-save").click();
 await expect(page.getByTestId(`team-${beta}`)).toBeVisible();
 await page.getByTestId(`team-member-open-${memberId}`).click();
 await page.getByTestId(`team-assignment-${memberId}-${alpha}`).click();
 await page.getByTestId(`team-assignment-${memberId}-${beta}`).click();
 await page.getByTestId(`team-rename-${alpha}`).click(); await page.getByTestId("team-name").fill("Renommée"); await page.getByTestId("team-save").click();
 await page.getByTestId(`team-assignment-${memberId}-${beta}`).click();
 await page.getByTestId(`team-archive-${alpha}`).click();
 await expect(page.getByTestId(`team-archived-${alpha}`)).toContainText("Renommée");
 await expect(page.getByTestId(`team-archived-${alpha}`)).toContainText("Alex");
 await expect(page.getByTestId(`team-assignment-${memberId}-${alpha}`)).toHaveCount(0);
 await page.reload(); await expect(page.getByTestId(`team-archived-${alpha}`)).toContainText("Alex");
 await page.getByTestId(`team-member-open-${memberId}`).click();
 await expect(page.getByTestId(`team-assignment-${memberId}-${beta}`)).toContainText("☐");
});

test("erreur de rechargement après écriture : aucun faux succès", async ({ page }) => {
 await setup(page, true); await page.goto("https://holidays.example/"); await page.getByTestId("admin-button").click();
 await page.getByTestId("team-name").fill("Alpha"); await page.getByTestId("team-save").click();
 await expect(page.getByTestId("teams-error")).toContainText("Réponse du serveur invalide");
 await expect(page.getByTestId("teams-notice")).toHaveCount(0);
});
