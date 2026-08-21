import { expect, test, type Page } from "@playwright/test";

async function expectNonBlankCanvas(page: Page): Promise<void> {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await expect.poll(async () =>
    canvas.evaluate((element) => {
      const canvasElement = element as HTMLCanvasElement;
      const context =
        canvasElement.getContext("webgl2") ?? canvasElement.getContext("webgl");
      if (!context) {
        return false;
      }
      const sample = new Uint8Array(4);
      for (let x = 0.1; x < 1; x += 0.2) {
        for (let y = 0.1; y < 1; y += 0.2) {
          context.readPixels(
            Math.floor(canvasElement.width * x),
            Math.floor(canvasElement.height * y),
            1,
            1,
            context.RGBA,
            context.UNSIGNED_BYTE,
            sample,
          );
          if (sample.some((channel) => channel > 8)) {
            return true;
          }
        }
      }
      return false;
    }),
  ).toBe(true);
}

test("@desktop dashboard exposes the protected registry workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/AI-PatentGuard/);
  await expect(page.getByRole("heading", { name: "Secure the logic." })).toBeVisible();
  await expect(page.getByText("Registered claims")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seal original logic" })).toBeVisible();
  await expectNonBlankCanvas(page);

  await page.getByRole("button", { name: "Start consensus audit" }).click();
  await expect(page.getByText("Enter a patent title.")).toBeVisible();
  await expect(page.getByText("Describe the protected logic.")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow-x", "hidden");
});

test("@mobile dashboard keeps the registration form within the viewport", async ({ page }) => {
  await page.goto("/");

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect(page.getByRole("heading", { name: "Secure the logic." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seal original logic" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(viewport?.width);
  await expectNonBlankCanvas(page);
});
