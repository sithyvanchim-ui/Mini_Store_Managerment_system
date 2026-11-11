import { expect, test } from "@playwright/test";
import {
  expectNoPageErrors,
  login,
  trackPageErrors,
} from "./helpers";

const routes = [
  { label: "Inventory", path: "/inventory", heading: /inventory/i },
  { label: "Sales", path: "/sales", heading: /sales|point of sale/i },
  { label: "Purchases", path: "/purchases", heading: /purchas/i },
  { label: "Stock", path: "/stock", heading: /stock/i },
  { label: "Daily Check", path: "/daily-check", heading: /daily/i },
  { label: "Suppliers", path: "/suppliers", heading: /supplier/i },
  { label: "Analytics", path: "/analytics", heading: /analytic|report/i },
  { label: "Settings", path: "/settings", heading: /settings/i },
  { label: "Help", path: "/help", heading: /help/i },
] as const;

test.describe("Dashboard navigation", () => {
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = trackPageErrors(page);
    await login(page);
  });

  test.afterEach(() => {
    expectNoPageErrors(pageErrors);
  });

  test("every sidebar destination renders its page heading", async ({ page }) => {
    for (const route of routes) {
      await test.step(`navigate to ${route.label}`, async () => {
        await page
          .getByRole("link", { name: route.label, exact: true })
          .first()
          .click();

        await page.waitForURL(
          (url) => url.pathname === route.path,
          { timeout: 15_000 },
        );
        await expect(
          page.getByRole("heading", { level: 1, name: route.heading }),
        ).toBeVisible();
      });
    }
  });

  test("the overview link returns home from a sub-page", async ({ page }) => {
    await page
      .getByRole("link", { name: "Settings", exact: true })
      .first()
      .click();
    await page.waitForURL((url) => url.pathname === "/settings");

    await page
      .getByRole("link", { name: "Overview", exact: true })
      .first()
      .click();
    await page.waitForURL((url) => url.pathname === "/");

    await expect(
      page.getByRole("heading", { level: 1, name: /overview/i }),
    ).toBeVisible();
  });
});
