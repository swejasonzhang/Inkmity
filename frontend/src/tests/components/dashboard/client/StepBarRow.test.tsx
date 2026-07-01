import { jest, describe, test, expect } from "@jest/globals";
import { render, screen } from "@/tests/setup/test-utils";
import StepBarRow from "@/components/dashboard/client/StepBarRow";

describe("StepBarRow", () => {
  test("jumps to a step when its tab is clicked", () => {
    const onGoToStep = jest.fn();
    render(<StepBarRow active={0} onGoToStep={onGoToStep} />);
    screen.getByRole("button", { name: "Reviews" }).click();
    expect(onGoToStep).toHaveBeenCalledWith(2);
  });

  test("prev/next move one step at a time", () => {
    const onGoToStep = jest.fn();
    render(<StepBarRow active={1} onGoToStep={onGoToStep} />);
    screen.getByRole("button", { name: "Next step" }).click();
    expect(onGoToStep).toHaveBeenCalledWith(2);
    screen.getByRole("button", { name: "Previous step" }).click();
    expect(onGoToStep).toHaveBeenCalledWith(0);
  });

  test("does not page past the ends (no prev on the first step)", () => {
    const onGoToStep = jest.fn();
    render(<StepBarRow active={0} onGoToStep={onGoToStep} />);
    screen.getByRole("button", { name: "Previous step" }).click();
    expect(onGoToStep).not.toHaveBeenCalled();
  });
});
