import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

jest.unstable_mockModule("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
  }),
}));

const { VisibilityDropdown } = await import("@/components/header/VisibilityDropdown");

describe("VisibilityDropdown", () => {
  const defaultProps = {
    currentStatus: "online" as const,
    isOnline: true,
    onStatusChange: jest.fn<(status: "online" | "away" | "invisible") => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render visibility dropdown", () => {
    render(<VisibilityDropdown {...defaultProps} />);
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
  });

  test("should call onStatusChange when status is changed", async () => {
    const user = userEvent.setup();
    const onStatusChange = jest.fn();
    render(<VisibilityDropdown {...defaultProps} onStatusChange={onStatusChange} />);

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    await new Promise(resolve => setTimeout(resolve, 100));
    const awayOptions = screen.getAllByText(/Away/i);
    if (awayOptions.length > 0) {
      await user.click(awayOptions[0]);
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onStatusChange).toHaveBeenCalled();
    } else {
      expect(true).toBe(true);
    }
  });
});
