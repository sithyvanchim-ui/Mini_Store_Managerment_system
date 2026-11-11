import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared helpers for the MiniStore smoke suite.
 *
 * Selectors prefer accessible roles and labels so they survive styling and
 * markup refactors. Where the UI contract is not final yet, the helpers fall
 * back to a small number of structural heuristics (e.g. the last button in a
 * table row is usually the row menu).
 */

export const demoAccounts = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@ministore.local",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Admin123!",
  },
  staff: {
    email: process.env.E2E_STAFF_EMAIL ?? "staff@ministore.local",
    password: process.env.E2E_STAFF_PASSWORD ?? "Staff123!",
  },
} as const;

export type DemoAccount = { email: string; password: string };

export function uniqueCode(prefix = "E2E"): string {
  return `${prefix}-${Date.now()}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Log in through the UI and wait for the overview page to render. */
export async function login(
  page: Page,
  account: DemoAccount = demoAccounts.admin,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(account.email);
  await page.getByLabel(/^password$/i).fill(account.password);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();

  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: /overview/i }),
  ).toBeVisible();
}

/** Log out using the persistent sidebar button and wait for the login route. */
export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^logout$/i }).first().click();
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 15_000 });
}

/**
 * Collect uncaught page errors. Call in `beforeEach` and assert with
 * `expectNoPageErrors` in `afterEach`.
 */
export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    // Chromium can emit this benign layout-loop warning during chart render.
    if (/ResizeObserver loop/i.test(error.message)) return;
    errors.push(error.message);
  });
  return errors;
}

export function expectNoPageErrors(errors: string[]): void {
  expect(errors, `uncaught page errors:\n${errors.join("\n")}`).toEqual([]);
}

/** Assert the document does not scroll horizontally (allows 1px rounding). */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      {
        message: "page should not overflow horizontally",
        timeout: 5_000,
      },
    )
    .toBeLessThanOrEqual(1);
}

/** Find the semantic table row that contains the given text. */
export function rowContaining(page: Page, text: string): Locator {
  return page.getByRole("row").filter({ hasText: text }).first();
}

/** Open a table row's overflow menu, preferring an accessible label. */
export async function openRowMenu(row: Locator): Promise<void> {
  const labelled = row.getByRole("button", {
    name: /actions|options|more|row menu|open menu/i,
  });

  if ((await labelled.count()) > 0) {
    await labelled.first().click();
    return;
  }

  await row.getByRole("button").last().click();
}

async function chooseNativeOption(
  field: Locator,
  optionText?: string,
): Promise<void> {
  const value = await field.evaluate((element, text) => {
    const select = element as HTMLSelectElement;
    const options = Array.from(select.options).filter(
      (option) => !option.disabled && option.value !== "",
    );
    if (!text) return options[0]?.value ?? "";
    const match = options.find((option) =>
      option.label.toLowerCase().includes(text.toLowerCase()),
    );
    return match?.value ?? options[0]?.value ?? "";
  }, optionText);

  if (value) await field.selectOption(value);
}

/**
 * Choose an option in either a native `<select>` or a Radix/shadcn combobox.
 * `optionText` is matched case-insensitively; when omitted the first option is
 * used (useful for required selects whose seeded values are not fixed).
 */
export async function selectField(
  field: Locator,
  optionText?: string,
): Promise<void> {
  await expect(field).toBeVisible();
  const tagName = await field.evaluate((element) =>
    element.tagName.toLowerCase(),
  );

  if (tagName === "select") {
    await chooseNativeOption(field, optionText);
    return;
  }

  await field.click();
  const options = field.page().getByRole("option");
  await expect(options.first()).toBeVisible();

  if (optionText) {
    const named = options.filter({
      hasText: new RegExp(escapeRegExp(optionText), "i"),
    });
    if ((await named.count()) > 0) {
      await named.first().click();
      return;
    }
  }

  await options.first().click();
}

/**
 * Fill a field whose control might be a text input, a textarea, a native
 * select, or a Radix combobox. Keeps form specs resilient while other agents
 * finalize the forms.
 */
export async function fillOrSelect(
  field: Locator,
  value: string,
): Promise<void> {
  await expect(field).toBeVisible();
  const tagName = await field.evaluate((element) =>
    element.tagName.toLowerCase(),
  );
  const role = await field.getAttribute("role");

  if (tagName === "select") {
    await chooseNativeOption(field, value);
    return;
  }
  if (tagName === "button" || role === "combobox") {
    await selectField(field, value);
    return;
  }

  await field.fill(value);
}

/** Fill a field only when it exists; returns whether it was filled. */
export async function fillIfPresent(
  scope: Page | Locator,
  label: RegExp,
  value: string,
): Promise<boolean> {
  const field = scope.getByLabel(label).first();
  if ((await field.count()) === 0) return false;
  await fillOrSelect(field, value);
  return true;
}

/** Try several label patterns in order and fill the first one that exists. */
export async function fillFirstMatch(
  scope: Page | Locator,
  labels: RegExp[],
  value: string,
): Promise<boolean> {
  for (const label of labels) {
    if (await fillIfPresent(scope, label, value)) return true;
  }
  return false;
}

/** Try several label patterns in order and select from the first match. */
export async function selectFirstMatch(
  scope: Page | Locator,
  labels: RegExp[],
  optionText?: string,
): Promise<boolean> {
  for (const label of labels) {
    const field = scope.getByLabel(label).first();
    if ((await field.count()) > 0) {
      await selectField(field, optionText);
      return true;
    }
  }
  return false;
}

/** Open a History tab/link/button if the page exposes one. */
export async function openHistory(page: Page): Promise<void> {
  const control = page
    .getByRole("tab", { name: /history/i })
    .or(page.getByRole("link", { name: /history/i }))
    .or(page.getByRole("button", { name: /history/i }))
    .first();

  await expect(control).toBeVisible();
  await control.click();
}
