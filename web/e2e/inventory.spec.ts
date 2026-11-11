import { expect, test, type Page } from "@playwright/test";
import {
  fillFirstMatch,
  fillIfPresent,
  login,
  openRowMenu,
  rowContaining,
  selectFirstMatch,
  uniqueCode,
} from "./helpers";

async function createProduct(
  page: Page,
  code: string,
  name: string,
): Promise<void> {
  await page
    .getByRole("button", {
      name: /add product|new product|create product/i,
    })
    .first()
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await fillFirstMatch(dialog, [/product code|^code$/i], code);
  await fillFirstMatch(dialog, [/product name|^name$/i], name);
  await selectFirstMatch(dialog, [/category/i], "Drink");
  await fillFirstMatch(dialog, [/package|unit/i], "Bottle");
  await fillFirstMatch(dialog, [/cost price|cost/i], "2000");
  await fillFirstMatch(dialog, [/selling price|retail price/i], "3000");
  await fillFirstMatch(
    dialog,
    [/stock qty|stock quantity|quantity/i, /^stock$/i],
    "5",
  );
  await fillFirstMatch(
    dialog,
    [/low stock( threshold)?|threshold|reorder point/i],
    "2",
  );
  await fillIfPresent(dialog, /note/i, "Created by the E2E smoke suite");
  await fillFirstMatch(dialog, [/slot( code)?/i], "E2E-1");
  await fillFirstMatch(dialog, [/location|storage/i], "Fridge");

  await dialog
    .getByRole("button", {
      name: /save|add product|create product|create|add/i,
    })
    .last()
    .click();

  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test.describe("Inventory", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/inventory");
    await expect(
      page.getByRole("heading", { level: 1, name: /inventory/i }),
    ).toBeVisible();
  });

  test("can add a product, adjust its stock and deactivate it", async ({
    page,
  }) => {
    const code = uniqueCode();
    const name = `E2E Test Product ${code}`;

    await test.step("create a product with a unique code", async () => {
      await createProduct(page, code, name);
      await expect(rowContaining(page, code)).toBeVisible();
    });

    await test.step("restock the product by 2 units", async () => {
      await openRowMenu(rowContaining(page, code));
      await page
        .getByRole("menuitem", { name: /adjust stock|stock adjustment|restock/i })
        .first()
        .click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      await selectFirstMatch(dialog, [/type/i], "Restock");
      await fillFirstMatch(dialog, [/quantity|qty|count/i], "2");
      await fillIfPresent(dialog, /note/i, "E2E restock");

      await dialog
        .getByRole("button", { name: /adjust|save|apply|confirm|restock/i })
        .last()
        .click();

      await expect(dialog).toBeHidden({ timeout: 15_000 });
      await expect(rowContaining(page, code)).toBeVisible();
    });

    await test.step("deactivate the product", async () => {
      await openRowMenu(rowContaining(page, code));

      const deactivate = page.getByRole("menuitem", {
        name: /deactivate|archive/i,
      });
      if ((await deactivate.count()) > 0) {
        await deactivate.first().click();
      } else {
        await page
          .getByRole("menuitem", { name: /delete/i })
          .first()
          .click();
      }

      const confirm = page
        .getByRole("alertdialog")
        .or(page.getByRole("dialog"))
        .first();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm
          .getByRole("button", {
            name: /deactivate|archive|delete|confirm|yes/i,
          })
          .last()
          .click();
        await expect(confirm).toBeHidden({ timeout: 15_000 });
      }

      // Either the default (active-only) list hides it, or the row shows an
      // Inactive badge. Both are valid deactivation outcomes.
      await expect
        .poll(
          async () => {
            const rows = page.getByRole("row").filter({ hasText: code });
            if ((await rows.count()) === 0) return "hidden";
            const inactive = await rows
              .first()
              .getByText(/inactive|deactivated/i)
              .count();
            return inactive > 0 ? "inactive" : "active";
          },
          { message: "product should be deactivated or hidden" },
        )
        .not.toBe("active");
    });
  });
});
