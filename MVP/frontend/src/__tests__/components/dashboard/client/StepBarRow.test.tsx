import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: StepBarRow } = await import("@/components/dashboard/client/StepBarRow");

describe("StepBarRow", () => {
  test("should render step bar row", () => {
    const { container } = render(<StepBarRow active={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should call onGoToStep when step is clicked", async () => {
    const user = userEvent.setup();
    const onGoToStep = jest.fn();
    render(<StepBarRow active={0} onGoToStep={onGoToStep} />);
    
    const buttons = screen.getAllByRole("button");
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      expect(onGoToStep).toHaveBeenCalled();
    }
  });
});
