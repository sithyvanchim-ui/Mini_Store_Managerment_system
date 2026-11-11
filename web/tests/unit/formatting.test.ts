import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatCompact,
  formatKHR,
  formatNumber,
  formatPercent,
  getInitials,
} from "@/lib/utils";

const KHR = "៛";

describe("formatKHR", () => {
  it("renders zero as a value, not as an empty state", () => {
    expect(formatKHR(0)).toBe(`0${KHR}`);
  });

  it("adds thousands separators", () => {
    expect(formatKHR(3000)).toBe(`3,000${KHR}`);
    expect(formatKHR(45_000)).toBe(`45,000${KHR}`);
    expect(formatKHR(1_234_567)).toBe(`1,234,567${KHR}`);
  });

  it("keeps amounts as integers", () => {
    expect(formatKHR(2667)).toBe(`2,667${KHR}`);
    expect(formatKHR(2667.9)).toBe(`2,668${KHR}`);
  });

  it("supports compact notation", () => {
    expect(formatKHR(1500, { compact: true })).toBe(`1.5K${KHR}`);
    expect(formatKHR(45_000, { compact: true })).toBe(`45K${KHR}`);
    expect(formatKHR(1_000_000, { compact: true })).toBe(`1M${KHR}`);
  });

  it("can omit the currency symbol", () => {
    expect(formatKHR(45_000, { withSymbol: false })).toBe("45,000");
  });

  it.each([null, undefined, Number.NaN])(
    "renders an em dash for missing value %s",
    (value) => {
      expect(formatKHR(value)).toBe("—");
      expect(formatKHR(value, { compact: true })).toBe("—");
    },
  );
});

describe("formatNumber / formatCompact", () => {
  it("formats plain counts with separators", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(12_345)).toBe("12,345");
    expect(formatNumber(599)).toBe("599");
  });

  it("returns an em dash for null, undefined and NaN", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatCompact(null)).toBe("—");
  });

  it("formats compact counts", () => {
    expect(formatCompact(1500)).toBe("1.5K");
    expect(formatCompact(1_000_000)).toBe("1M");
  });
});

describe("formatPercent", () => {
  it("respects the default one-decimal precision", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(16.54)).toBe("16.5%");
    expect(formatPercent(27)).toBe("27.0%");
  });

  it("supports a custom number of digits", () => {
    expect(formatPercent(50, 0)).toBe("50%");
    expect(formatPercent(12.345, 2)).toBe("12.35%");
  });

  it("returns an em dash for missing values", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatChange", () => {
  it("adds an explicit plus sign for growth", () => {
    expect(formatChange(16.54)).toBe("+16.5%");
    expect(formatChange(0.1)).toBe("+0.1%");
  });

  it("keeps the minus sign for declines", () => {
    expect(formatChange(-3.2)).toBe("-3.2%");
    expect(formatChange(-0.04)).toBe("-0.0%");
  });

  it("does not add a sign for zero", () => {
    expect(formatChange(0)).toBe("0.0%");
  });

  it("returns an em dash for missing values", () => {
    expect(formatChange(null)).toBe("—");
    expect(formatChange(undefined)).toBe("—");
    expect(formatChange(Number.NaN)).toBe("—");
  });
});

describe("getInitials", () => {
  it("uses the first letter of the first two words", () => {
    expect(getInitials("Sarah Green")).toBe("SG");
    expect(getInitials("Sokha Chan Dara")).toBe("SC");
  });

  it("collapses extra whitespace", () => {
    expect(getInitials("  sarah   green  ")).toBe("SG");
  });

  it("handles a single name", () => {
    expect(getInitials("Admin")).toBe("A");
  });

  it("falls back to a question mark for empty input", () => {
    expect(getInitials("")).toBe("?");
    expect(getInitials("   ")).toBe("?");
    expect(getInitials(null)).toBe("?");
    expect(getInitials(undefined)).toBe("?");
  });
});
