import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductThumb } from "@/components/shared/product-thumb";

function thumbText(container: HTMLElement): string {
  const thumb = container.querySelector('[aria-hidden="true"]');
  expect(thumb).not.toBeNull();
  return thumb?.textContent ?? "";
}

describe("ProductThumb", () => {
  it("shows the initials of a multi-word product name", () => {
    const { container } = render(<ProductThumb name="Kulen Big" />);
    expect(thumbText(container)).toBe("KB");
  });

  it("shows a single initial for a single-word name", () => {
    const { container } = render(<ProductThumb name="Angkor" />);
    expect(thumbText(container)).toBe("A");
  });

  it("falls back to a question mark for an empty name", () => {
    const { container } = render(<ProductThumb name="" />);
    expect(thumbText(container)).toBe("?");
  });

  it("stays decorative for assistive technology", () => {
    const { container } = render(
      <ProductThumb name="Provida Small" category="Drink" size="lg" />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(thumbText(container)).toBe("PS");
  });
});
