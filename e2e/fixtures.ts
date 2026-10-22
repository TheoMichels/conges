import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && !/Download the React DevTools/i.test(message.text())) errors.push(message.text());
    });
    await use();
    expect(errors, "No uncaught page or console errors").toEqual([]);
  }, { auto: true }],
});
export { expect };
