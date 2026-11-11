import { describe, expect, it } from "vitest";
import { saleStatusMeta, stockStatusMeta } from "@/lib/utils";

describe("stockStatusMeta", () => {
  it("labels in-stock products", () => {
    expect(stockStatusMeta("in_stock").label).toBe("In stock");
  });

  it("labels low-stock products", () => {
    expect(stockStatusMeta("low_stock").label).toBe("Low stock");
  });

  it("labels out-of-stock products", () => {
    expect(stockStatusMeta("out_of_stock").label).toBe("Out of stock");
  });

  it("defaults unknown values to in stock rather than crashing", () => {
    expect(stockStatusMeta("something_new").label).toBe("In stock");
  });

  it("returns a distinct dot class for each status", () => {
    const tones = [
      stockStatusMeta("in_stock"),
      stockStatusMeta("low_stock"),
      stockStatusMeta("out_of_stock"),
    ];
    expect(new Set(tones.map((tone) => tone.dotClassName)).size).toBe(3);
  });
});

describe("saleStatusMeta", () => {
  it("labels completed sales", () => {
    expect(saleStatusMeta("completed").label).toBe("Completed");
  });

  it("labels voided sales", () => {
    expect(saleStatusMeta("voided").label).toBe("Voided");
  });

  it("treats unknown statuses as completed", () => {
    expect(saleStatusMeta("pending").label).toBe("Completed");
  });
});

