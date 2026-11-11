import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/shared/empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(
      <EmptyState
        title="No products yet"
        description="Add your first product to start tracking stock."
      />,
    );

    expect(screen.getByText("No products yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first product to start tracking stock."),
    ).toBeInTheDocument();
  });

  it("renders an action when provided", () => {
    render(
      <EmptyState
        title="No sales today"
        description="Completed sales will appear here."
        action={<button type="button">New sale</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "New sale" })).toBeInTheDocument();
  });

  it("omits optional description and action content", () => {
    const { container } = render(<EmptyState title="Nothing here" />);

    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The default Inbox icon is the only svg.
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("renders a custom icon instead of the default", () => {
    render(
      <EmptyState
        title="No alerts"
        icon={<svg data-testid="custom-icon" aria-hidden="true" />}
      />,
    );

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
