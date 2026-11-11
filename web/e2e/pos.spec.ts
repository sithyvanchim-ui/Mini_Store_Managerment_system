import { expect, test } from "@playwright/test";
import { login, openHistory, rowContaining } from "./helpers";

test.describe("Point of sale", () => {
  test("completes an ABA sale and finds it in history", async ({ page }) => {
    await login(page);
    await page.goto("/sales");
    await expect(
      page.getByRole("heading", { level: 1, name: /sales|point of sale/i }),
    ).toBeVisible();

    await test.step("add an in-stock product to the cart", async () => {
      const search = page
        .getByPlaceholder(/search (products?|items?|the catalog)/i)
        .first();
      if ((await search.count()) > 0) {
        await search.fill("Kulen");
      }

      // Product tiles are buttons and show their price in KHR. Exclude the
      // payment/checkout controls, which also contain a KHR amount.
      const tile = page
        .getByRole("button")
        .filter({ hasText: /៛/ })
        .filter({
          hasNotText: /aba|charge|checkout|complete sale|history|void|discount/i,
        })
        .first();

      await expect(tile).toBeVisible();
      await tile.click();
    });

    await test.step("charge via the ABA confirmation dialog", async () => {
      await page
        .getByRole("button", {
          name: /charge|complete sale|checkout|pay now|take payment/i,
        })
        .first()
        .click();

      // The ABA-only confirm dialog asks the operator to verify the transfer
      // on the customer's phone before completing the sale.
      const confirm = page
        .getByRole("dialog")
        .filter({ hasText: /ABA/i })
        .first();
      await expect(confirm).toBeVisible({ timeout: 15_000 });
      await confirm
        .getByRole("button", { name: /charge|confirm|yes/i })
        .first()
        .click();
    });

    let reference = "";

    await test.step("capture the receipt reference", async () => {
      await page
        .getByRole("button", {
          name: /charge|complete sale|checkout|pay now|take payment/i,
        })
        .first()
        .click();

      const receipt = page
        .getByRole("dialog")
        .filter({ hasText: /MS-\d{8}-\d{4,}/ })
        .first();
      await expect(receipt).toBeVisible({ timeout: 15_000 });

      const receiptText = await receipt.innerText();
      const match = receiptText.match(/MS-\d{8}-\d{4,}/);
      expect(
        match?.[0],
        `receipt should contain a sale reference:\n${receiptText}`,
      ).toBeTruthy();
      reference = match?.[0] ?? "";

      const close = receipt
        .getByRole("button", { name: /close|done|new sale|finish/i })
        .first();
      if ((await close.count()) > 0) {
        await close.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await expect(receipt).toBeHidden({ timeout: 15_000 });
    });

    await test.step("the sale appears in history", async () => {
      await openHistory(page);
      await expect
        .poll(
          async () => {
            if ((await rowContaining(page, reference).count()) > 0) return true;
            return (await page.getByText(reference).count()) > 0;
          },
          { message: `sale ${reference} should appear in history` },
        )
        .toBe(true);
    });
  });
});
