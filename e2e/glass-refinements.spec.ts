import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-01-05T10:00:00Z"));
  await page.addInitScript(() => localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
    id: "refinements", year: "2026", createdAt: 1, initialLeave: 26,
    carriedOver: 0, csupp: 0, publicHolidays: 0,
    entries: [{ id: "rest", createdAt: 1, kind: "month", label: "Repos", month: 3, days: 2 }],
  }])));
});

for (const width of [390, 1920, 2560]) {
  test(`uses available width without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    const header = page.getByTestId("app-header");
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS("border-bottom-width", "0px");
    await expect(page.getByTestId("sidebar-toggle")).toHaveCount(0);
    expect((await header.boundingBox())?.width).toBeGreaterThan(width - 65);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByTestId("add-leave-button")).toBeVisible();
    if (width > 768) await expect(page.getByTestId("year-sidebar")).toBeVisible();
    await page.screenshot({ path: `test-results/glass-refinements-${width}.png`, fullPage: true });
  });
}

test("flat section and leave actions retain editing and deletion", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  const rename = page.getByRole("button", { name: "Modifier la section 2026", exact: true });
  await expect(rename).toBeVisible();
  for (const button of [rename, page.getByRole("button", { name: "Supprimer la section 2026", exact: true }),
    page.getByRole("button", { name: "Modifier le congé", exact: true }),
    page.getByRole("button", { name: "Supprimer le congé", exact: true })]) {
    expect((await button.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    await expect(button).toHaveCSS("box-shadow", "none");
    await expect(button.locator("svg")).toHaveCount(1);
  }
  await rename.click();
  const sectionInput = page.getByTestId("section-name-input");
  await sectionInput.fill("2027");
  await sectionInput.press("Enter");
  await expect(page.getByRole("button", { name: "Modifier la section 2027", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Supprimer la section 2027", exact: true }).click();
  await expect(page.getByText("Supprimer 2027 ?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Annuler la suppression", exact: true }).click();
  await page.getByRole("button", { name: "Modifier le congé", exact: true }).click();
  await page.getByPlaceholder("Motif des congés").fill("Repos modifié");
  await page.getByText("Enregistrer", { exact: true }).click();
  await expect(page.getByText("Repos modifié", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Supprimer le congé", exact: true }).click();
  await expect(page.getByText("Repos modifié", { exact: true })).toHaveCount(0);
});
