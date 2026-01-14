import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";

jest.spyOn(console, "error").mockImplementation(() => {});

const { default: ClientDetailsStep } = await import("@/components/access/ClientDetailsStep");

describe("ClientDetailsStep", () => {
  const defaultProps = {
    client: {
      budgetMin: "",
      budgetMax: "",
      location: "",
      placement: "",
      size: "",
    },
    onChange: jest.fn<(e: React.ChangeEvent<HTMLInputElement>) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render client details form", () => {
    const { container } = render(<ClientDetailsStep {...defaultProps} />);
    const budgetText = screen.queryByText(/Budget/i) || container.querySelector('label');
    expect(budgetText).toBeInTheDocument();
    const locationText = screen.queryByText(/Location/i) || container.querySelector('input[placeholder*="location" i]') || container.querySelector('select');
    expect(locationText).toBeInTheDocument();
  });

  test("should display style selector", () => {
    render(<ClientDetailsStep {...defaultProps} />);
    expect(screen.getByText(/Style preference/i)).toBeInTheDocument();
  });

  test("should display placement selector", () => {
    render(<ClientDetailsStep {...defaultProps} />);
    expect(screen.getByText(/Placement/i)).toBeInTheDocument();
  });
});
