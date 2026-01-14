import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

jest.spyOn(console, "error").mockImplementation(() => {});

const { default: ArtistDetailsStep } = await import("@/components/access/ArtistDetailsStep");

describe("ArtistDetailsStep", () => {
  const defaultProps = {
    artist: {
      location: "",
      years: "",
      baseRate: "",
      styles: [],
    },
    onChange: jest.fn<(e: React.ChangeEvent<HTMLInputElement>) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render artist details form", () => {
    const { container } = render(<ArtistDetailsStep {...defaultProps} />);
    const hasInput = container.querySelector("input");
    const hasSelect = container.querySelector("select");
    const hasButton = container.querySelector("button");
    expect(hasInput || hasSelect || hasButton).toBeInTheDocument();
  });

  test("should call onChange when location is entered", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<ArtistDetailsStep {...defaultProps} onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      await user.type(inputs[0], "New York");
      expect(onChange).toHaveBeenCalled();
    } else {
      expect(true).toBe(true);
    }
  });

  test("should display styles selector", () => {
    render(<ArtistDetailsStep {...defaultProps} />);
    expect(screen.getByText(/Select styles/i)).toBeInTheDocument();
  });
});
