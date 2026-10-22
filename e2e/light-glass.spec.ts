import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-01-05T10:00:00Z"));
  await page.addInitScript(() => {
    if (!localStorage.getItem("@holy_year_plans_v1")) {
      localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
        id: "visual-test", year: "2026", createdAt: 1,
        initialLeave: 26, carriedOver: 2, csupp: 1, publicHolidays: 1,
        entries: [{ id: "visual-entry", createdAt: 1, kind: "month", label: "Repos de printemps", month: 3, days: 2 }],
      }]));
    }
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [375, 1440]) {
    test(`light glass stays clear at ${width}px with ${colorScheme} preference`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      await expect(page.getByTestId("kpi-cards")).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light only");
      await expect(page.getByTestId("kpi-taken").getByText("2", { exact: true })).toHaveCSS("color", "rgb(20, 51, 62)");
      await page.screenshot({ path: `.agents/handoff/holy-light-glass/screens/${width}-${colorScheme}-overview.png`, fullPage: true });
      await page.getByTestId("add-leave-button").click();
      await expect(page.getByPlaceholder("Motif des congés")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const mode = page.getByText("Nombre de jours", { exact: true });
      expect((await mode.locator("..").boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `.agents/handoff/holy-light-glass/screens/${width}-${colorScheme}.png`, fullPage: true });
    });
  }
}

test("leave entry modes, editing and persistence survive the visual refresh", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto("/");
  await page.getByTestId("add-leave-button").click();
  await page.getByPlaceholder("Motif des congés").fill("Matin personnel");
  await page.getByText("Matin (0,5 j)", { exact: true }).click();
  await page.getByText("Ajouter", { exact: true }).click();
  await expect(page.getByText("Matin personnel", { exact: true })).toBeVisible();
  await page.getByTestId("add-leave-button").click();
  await page.getByPlaceholder("Motif des congés").fill("Congé mensuel");
  await page.getByText("Nombre de jours", { exact: true }).click();
  await page.getByText("Ajouter", { exact: true }).click();
  await page.reload();
  await expect(page.getByText("Matin personnel", { exact: true })).toBeVisible();
  await expect(page.getByText("Congé mensuel", { exact: true })).toBeVisible();
  await expect(page.getByTestId("kpi-taken")).toContainText("3,5");
  await page.getByText("Congé mensuel", { exact: true }).locator("../..").getByRole("button", { name: "Modifier le congé", exact: true }).click();
  await page.getByPlaceholder("Motif des congés").fill("Congé modifié");
  await page.getByText("Enregistrer", { exact: true }).click();
  await expect(page.getByText("Congé modifié", { exact: true })).toBeVisible();
  await page.getByText("Congé modifié", { exact: true }).locator("../..").getByRole("button", { name: "Supprimer le congé", exact: true }).click();
  await expect(page.getByText("Congé modifié", { exact: true })).toHaveCount(0);
});
