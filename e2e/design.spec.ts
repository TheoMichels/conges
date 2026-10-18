import { test, expect } from "@playwright/test";

test.describe("Design System & Glassmorphism — Lot 2", () => {
  test("renders Header, local storage badge, and KpiCards on desktop without errors", async ({
    page,
  }) => {
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

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. Verify Header, Holy title, and isolated boat logo
    const header = page.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible({ timeout: 15_000 });
    await expect(header.locator("text=Holy").first()).toBeVisible();
    await expect(page.locator('[data-testid="app-logo"]').first()).toBeVisible();

    // 2. Verify Local storage badge
    const localBadge = page.locator('[data-testid="local-badge"]');
    await expect(localBadge).toBeVisible();
    await expect(localBadge).toContainText("Stockage local");

    // 3. Verify Sidebar toggle on desktop
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    await expect(sidebarToggle).toBeVisible();

    // 4. Verify KPI Cards are rendered
    const kpiCards = page.locator('[data-testid="kpi-cards"]');
    await expect(kpiCards).toBeVisible();

    const remainingKpi = page.locator('[data-testid="kpi-remaining"]');
    await expect(remainingKpi).toBeVisible();
    await expect(remainingKpi).toContainText("Solde restant");

    const takenKpi = page.locator('[data-testid="kpi-taken"]');
    await expect(takenKpi).toBeVisible();
    await expect(takenKpi).toContainText("Congés pris");

    const totalKpi = page.locator('[data-testid="kpi-total"]');
    await expect(totalKpi).toBeVisible();
    await expect(totalKpi).toContainText("Droits totaux");

    // Ensure no uncaught browser console errors occurred
    expect(errors, "Expected no browser console errors on desktop").toEqual([]);
  });

  test("toggles sidebar on desktop when clicking sidebar toggle button", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    await expect(sidebarToggle).toBeVisible({ timeout: 15_000 });

    // Click toggle to close
    await sidebarToggle.click();
    await page.waitForTimeout(350);

    // Click toggle to reopen
    await sidebarToggle.click();
    await page.waitForTimeout(350);
  });

  test("renders cleanly on mobile (375px) without horizontal overflow and with accessible touch targets", async ({
    page,
  }) => {
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

    // Compact mobile viewport (iPhone SE width)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // 1. Verify Header & Local badge on mobile
    const header = page.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible({ timeout: 15_000 });

    const localBadge = page.locator('[data-testid="local-badge"]');
    await expect(localBadge).toBeVisible();
    await expect(localBadge).toContainText("Stockage local");

    // On mobile, the desktop sidebar toggle should not be displayed
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    await expect(sidebarToggle).toHaveCount(0);

    // 2. Verify KpiCards rendered on mobile
    const kpiCards = page.locator('[data-testid="kpi-cards"]');
    await expect(kpiCards).toBeVisible();

    // 2b. Verify Mobile Dashboard and absence of pie chart / progress ring SVG
    const mobileDashboard = page.locator('[data-testid="mobile-dashboard"]');
    await expect(mobileDashboard).toBeVisible();
    const progressCircle = page.locator('[data-testid="mobile-dashboard"] svg circle');
    await expect(progressCircle).toHaveCount(0);

    const mobileTotals = page.locator('[data-testid="mobile-dashboard-totals"]');
    await expect(mobileTotals).toHaveCount(0);

    // 3. Verify no horizontal overflow at 375px
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(
      hasHorizontalOverflow,
      "Expected no horizontal scroll/overflow at 375px"
    ).toBe(false);

    // 4. Verify touch targets on interactive buttons
    const addLeaveButton = page.locator('[data-testid="add-leave-button"]');
    await expect(addLeaveButton).toBeVisible();
    const box = await addLeaveButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(
        box.height,
        "Add leave button height must be at least 44px for touch accessibility"
      ).toBeGreaterThanOrEqual(44);
    }

    expect(errors, "Expected no browser console errors on mobile").toEqual([]);
  });
});
