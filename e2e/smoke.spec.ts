import { test, expect } from "@playwright/test";

test.describe("Smoke test — Holy application loading", () => {
  test("loads the application without errors and displays year or leave content", async ({
    page,
  }) => {
    // Collect uncaught console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" &&
        !/Download the React DevTools/i.test(msg.text())
      ) {
        errors.push(`console.error: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    // Navigate to root
    await page.goto("/");

    // Verify page title and ensure root container is rendered
    await expect(page).toHaveTitle(/Holy/);

    // Wait for the app to finish loading (loading placeholder disappears or content appears)
    // The main view displays either year plan header (e.g. 2026), or sidebar years, or leave entries
    const yearIndicator = page.locator("text=/202[4-9]/").first();
    await expect(yearIndicator).toBeVisible({ timeout: 15_000 });

    // Verify no unhandled console errors occurred during initial load
    expect(errors, "Expected no browser console errors on startup").toEqual([]);
  });
});
