import { test, expect } from "./fixtures";

for (const width of [375, 1440]) {
  test(`F02 removes the rate and preserves existing balance at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2022-01-05T10:00:00Z"));
    await page.addInitScript(() => {
      localStorage.setItem("@holy_storage_isolation_v2", "1");
      if (!localStorage.getItem("@holy_year_plans_v1")) localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
        id: "old", year: "2022", createdAt: 1, initialLeave: 26, carriedOver: 2, csupp: 1,
        publicHolidays: 3, workPercentage: 80,
        entries: [{ id: "e", kind: "month", label: "Vacances", month: 6, days: 5, createdAt: 1 }],
      }]));
    });
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Taux d’activité annuel (%)" })).toHaveCount(0);
    await expect(page.getByTestId("kpi-taken")).toContainText("5");
    await expect(page.getByTestId("kpi-remaining")).toContainText("26,4");
    await page.reload();
    await expect(page.getByTestId("kpi-remaining")).toContainText("26,4");
    if (width < 768) {
      await page.getByText("+ Ajouter", { exact: true }).click();
    } else {
      await page.getByText("+ Ajouter une année", { exact: true }).click();
      await page.getByPlaceholder("AAAA").fill("2023");
      await page.getByPlaceholder("AAAA").press("Enter");
    }
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("@holy_year_plans_v1")!).find((p: { year: string }) => p.year === "2023")?.holidayOverride)).toBeNull();
    await expect(page.getByTestId("kpi-total")).toContainText("27,4");
    await expect(page.getByRole("textbox", { name: "Taux d’activité annuel (%)" })).toHaveCount(0);
  });
}
