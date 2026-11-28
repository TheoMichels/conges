import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("serves the new Holy logo in the app and as install and browser icons", async ({ page }) => {
  await page.goto("/");

  const logo = page.getByTestId("app-header").getByTestId("app-logo");
  await expect(logo).toBeVisible();
  const headerImage = logo.locator("img");
  await expect(headerImage).toHaveJSProperty("naturalWidth", 1024);
  const headerSource = await headerImage.evaluate((image) => (image as HTMLImageElement).currentSrc);
  const iconLinks = [
    ['link[rel="apple-touch-icon"][sizes="180x180"]', "/apple-touch-icon.png", 180, false],
    ['link[rel="apple-touch-icon-precomposed"]', "/apple-touch-icon-precomposed.png", 180, false],
    ['link[rel="icon"][sizes="16x16"]', "/favicon-16.png", 16, true],
    ['link[rel="icon"][sizes="32x32"]', "/favicon-32.png", 32, true],
    ['link[rel="icon"][sizes="64x64"]', "/favicon.png", 64, true],
  ] as const;

  for (const [selector, path] of iconLinks) {
    await expect(page.locator(selector)).toHaveAttribute("href", path);
  }
  await expect(page.locator('link[rel="icon"]')).toHaveCount(3);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.json");
  const manifest = await page.request.get("/manifest.json");
  await expect(manifest).toBeOK();
  expect(await manifest.json()).toMatchObject({
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/favicon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", purpose: "any maskable" }),
    ]),
  });

  for (const [path, size, hasAlpha] of [
    [headerSource, 1024, true],
    ...iconLinks.map(([, path, size, hasAlpha]) => [path, size, hasAlpha] as const),
    ["/favicon-192.png", 192, false],
    ["/icon-512.png", 512, false],
  ] as const) {
    const response = await page.request.get(path);
    await expect(response, path).toBeOK();
    expect(response.headers()["content-type"], path).toContain("image/png");
    const image = sharp(await response.body());
    expect(await image.metadata(), path).toMatchObject({ width: size, height: size, hasAlpha });
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    if (hasAlpha) {
      expect(data[3], path).toBe(0);
    } else {
      expect([...data.subarray(0, 3)], path).toEqual([255, 255, 255]);
    }
    const hasOrangeSail = data.some((red, offset) => {
      const green = data[offset + 1];
      const blue = data[offset + 2];
      return offset % info.channels === 0 && red > 165 && red - green > 45 && green - blue > 25;
    });
    expect(hasOrangeSail, path).toBe(true);
  }

  await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute("href", "/favicon.ico");
  const icoResponse = await page.request.get("/favicon.ico");
  await expect(icoResponse).toBeOK();
  const ico = await icoResponse.body();
  expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    const icon = sharp(ico.subarray(offset, offset + length));
    expect(await icon.metadata()).toMatchObject({ width: size, height: size, hasAlpha: true });
    const pixels = await icon.raw().toBuffer();
    expect(pixels[3]).toBe(0);
    expect(pixels[4 * Math.floor(size / 2) + 3]).toBe(255);
  }
});
