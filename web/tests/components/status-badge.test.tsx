import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SaleStatusBadge,
  StatusBadge,
  StockStatusBadge,
} from "@/components/shared/status-badge";

describe("StockStatusBadge", () => {
  it.each([
    ["in_stock", "In stock"],
    ["low_stock", "Low stock"],
    ["out_of_stock", "Out of stock"],
  ])("renders %s as %s", (status, label) => {
    render(<StockStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("SaleStatusBadge", () => {
  it("renders completed sales", () => {
    render(<SaleStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders voided sales", () => {
    render(<SaleStatusBadge status="voided" />);
    expect(screen.getByText("Voided")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it.each(["success", "warning", "danger", "neutral", "brand", "lavender"] as const)(
    "renders the %s tone with its label",
    (tone) => {
      render(<StatusBadge label={`Tone ${tone}`} tone={tone} />);
      expect(screen.getByText(`Tone ${tone}`)).toBeInTheDocument();
    },
  );

  it("shows a dot by default", () => {
    const { container } = render(<StatusBadge label="Open" tone="success" />);

    // Badge root span, with one nested span for the dot.
    expect(container.querySelectorAll("span span")).toHaveLength(1);
  });

  it("can hide the dot", () => {
    const { container } = render(
      <StatusBadge label="Open" tone="success" dot={false} />,
    );

    expect(container.querySelectorAll("span span")).toHaveLength(0);
  });
});
