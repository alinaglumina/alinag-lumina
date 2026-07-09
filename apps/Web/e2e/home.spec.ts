import { test, expect } from "@playwright/test";

// These run against the storefront's SSR sample-data fallback, so they pass even
// before the API/DB is connected. Extend with full-stack flows once the API is up in CI.
test("home page renders hero + trending products", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();
});

test("can navigate to a product detail page", async ({ page }) => {
  await page.goto("/products");
  await page.locator("a.card").first().click();
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole("button", { name: /add to cart/i })).toBeVisible();
});

test("legal content page renders (privacy policy)", async ({ page }) => {
  await page.goto("/privacy-policy");
  await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
});
