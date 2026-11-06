import { test, expect } from "./fixtures";

for (const width of [1440, 375]) {
  test(`annual rate validation, totals, persistence and independence at ${width}px`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2022-01-05T10:00:00Z"));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      if (!localStorage.getItem("@holy_year_plans_v1")) {
        localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
          id: "rate-2022", year: "2022", createdAt: 1, initialLeave: 26,
          carriedOver: 2, csupp: 1, publicHolidays: 3,
          entries: [{ id: "entry", kind: "month", label: "Vacances", month: 6, days: 5, createdAt: 1 }],
        }]));
      }
    });
    await page.goto("/");
    const rate = page.getByRole("textbox", { name: "Taux d’activité annuel (%)" });
    await expect(rate).toHaveValue("100");
    await rate.fill("80");
    await expect(page.getByTestId("holiday-entitlement")).toHaveText("3 jour(s) à temps plein × 80 % = 2,4 jour(s) récupérable(s)");
    await expect(page.getByTestId("kpi-total")).toContainText("31,4");
    await expect(page.getByTestId("kpi-remaining")).toContainText("26,4");
    await expect(page.getByTestId("kpi-taken")).toContainText("5");
    for (const invalid of ["", "0", "100.01", "80.001", "abc"]) {
      await rate.fill(invalid);
      await expect(page.getByTestId("work-percentage-error")).toContainText("Le dernier taux valide est conservé");
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("@holy_year_plans_v1")!)[0].workPercentage)).toBe(80);
      await expect(page.getByTestId("kpi-total")).toContainText("31,4");
    }
    await page.reload();
    await expect(rate).toHaveValue("80");
    await page.getByTestId("holiday-details-toggle").click();
    await expect(page.getByTestId("holiday-details")).toContainText("samedi");
    await expect(page.getByTestId("holiday-details")).toContainText("dimanche");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const inputBox = await rate.boundingBox();
    expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `.agents/handoff/work-percentage/screens/${width}.png`, fullPage: true });
    // New annual plan defaults to 100, rather than inheriting the previous rate.
    if (width === 375) {
      await page.getByText("+ Ajouter", { exact: true }).click();
      await expect(rate).toHaveValue("100");
      await page.getByText("2022", { exact: true }).click();
      await expect(rate).toHaveValue("80");
      await page.getByText("2023", { exact: true }).click();
      await rate.fill("33,33");
      await expect(rate).toHaveValue("33,33");
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("@holy_year_plans_v1")!).find((plan: { year: string }) => plan.year === "2023").workPercentage)).toBe(33.33);
      await page.reload();
      // Reload selects the current year (2022 in this isolated clock), not the last viewed year.
      await expect(rate).toHaveValue("80");
      await page.getByText("2023", { exact: true }).click();
      await expect(rate).toHaveValue("33,33");
    }
  });
}

test("mobile coincidence details remain visible and are prorated", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.addInitScript(() => localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
    id: "coincidence", year: "2024", createdAt: 1, initialLeave: 26, carriedOver: 0,
    csupp: 0, publicHolidays: 2, workPercentage: 80, entries: [],
  }])));
  await page.goto("/");
  await expect(page.getByTestId("holiday-entitlement")).toContainText("= 1,6 jour(s)");
  await page.getByTestId("holiday-details-toggle").click();
  await expect(page.getByTestId("holiday-details")).toContainText("Coïncidence de 2 jours fériés");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
