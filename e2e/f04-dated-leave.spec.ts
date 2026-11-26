import { test, expect } from "./fixtures";

for (const width of [375, 1440]) {
  test(`F04 dated leave and historical recovery persist at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.clock.setFixedTime(new Date("2026-02-04T10:00:00Z"));
    await page.addInitScript(() => {
      localStorage.setItem("@holy_storage_isolation_v2", "1");
      if (!localStorage.getItem("@holy_year_plans_v1")) localStorage.setItem("@holy_year_plans_v1", JSON.stringify([{
        id: "plan", year: "2026", createdAt: 1, initialLeave: 26, carriedOver: 0, csupp: 0,
        holidayOverride: null, publicHolidays: 0, entries: [
          { id: "occupied", kind: "dates", label: "Matin déjà pris", startDate: "2026-02-02", endDate: "2026-02-02", startHalf: "morning", endHalf: "morning", createdAt: 1 },
          { id: "legacy", kind: "month", label: "Ancien congé", month: 1, days: 1.5, createdAt: 2 },
          { id: "exception", kind: "month", label: "À régulariser", month: 1, days: 1.2, createdAt: 3 },
        ],
      }]));
    });
    await page.goto("/");
    await expect(page.getByText(/Dates estimées/)).toBeVisible();
    await expect(page.getByText(/À dater/)).toBeVisible();
    await expect(page.getByTestId("kpi-taken")).toContainText("3,2");
    await page.getByTestId("edit-leave-exception").click();
    await expect(page.getByText("Nombre de jours", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("leave-day-total")).toContainText("1 jour");
    await page.getByTestId("submit-leave-button").click();
    await expect(page.getByText(/À dater/)).toHaveCount(0);
    await expect(page.getByTestId("kpi-taken")).toContainText("3");
    await page.reload();
    await expect(page.getByText(/Dates estimées/)).toBeVisible();
    await expect(page.getByText(/À dater/)).toHaveCount(0);
    await page.getByTestId("edit-leave-legacy").click();
    await page.getByTestId("submit-leave-button").click();
    await expect(page.getByText(/Dates estimées/)).toHaveCount(0);
    await page.getByTestId("add-leave-button").click();
    await page.getByPlaceholder("Motif des congés").fill("Matinée");
    await page.getByText("Matin (0,5 j)").click();
    await expect(page.getByTestId("leave-day-total")).toContainText("0,5");
    await page.getByTestId("submit-leave-button").click();
    await page.reload();
    await expect(page.getByText("Matinée", { exact: true })).toBeVisible();
    await expect(page.getByTestId("kpi-taken")).toContainText("3,5");
  });
}
