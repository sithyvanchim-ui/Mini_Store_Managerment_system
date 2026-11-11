import { expect, test } from "@playwright/test";
import { demoAccounts, login, logout } from "./helpers";

test.describe("Authentication", () => {
  test("admin can sign in and lands on the overview", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: /ministore|welcome|sign in/i }),
    ).toBeVisible();

    await page.getByLabel(/email/i).fill(demoAccounts.admin.email);
    await page.getByLabel(/^password$/i).fill(demoAccounts.admin.password);
    await page
      .getByRole("button", { name: /sign in|log in|login/i })
      .click();

    await test.step("redirected to the overview", async () => {
      await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
      await expect(
        page.getByRole("heading", { level: 1, name: /overview/i }),
      ).toBeVisible();
    });

    await test.step("persistent sidebar is visible", async () => {
      await expect(
        page.getByRole("link", { name: "Inventory", exact: true }),
      ).toBeVisible();
    });
  });

  test("wrong password shows an error and stays on the login page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(demoAccounts.admin.email);
    await page.getByLabel(/^password$/i).fill("definitely-not-the-password");
    await page
      .getByRole("button", { name: /sign in|log in|login/i })
      .click();

    await expect(
      page
        .getByText(
          /invalid|incorrect|wrong|failed|unable to sign in|check your credentials/i,
        )
        .first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logout clears the session and returns to login", async ({ page }) => {
    await login(page);
    await logout(page);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });
});
