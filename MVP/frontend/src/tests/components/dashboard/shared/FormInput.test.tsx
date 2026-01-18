import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: FormInput } = await import("@/components/dashboard/shared/FormInput");

describe("FormInput", () => {
  const defaultProps = {
    type: "text",
    name: "test-input",
    value: "",
    onChange: jest.fn<React.ChangeEventHandler<HTMLInputElement>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render form input", () => {
    render(<FormInput {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  test("should call onChange when input changes", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<FormInput {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByRole("textbox");
    await user.type(input, "test");
    expect(onChange).toHaveBeenCalled();
  });

  test("should display message when provided", () => {
    render(<FormInput {...defaultProps} message="Test message" />);
    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  test("should toggle password visibility", async () => {
    const user = userEvent.setup();
    const onTogglePassword = jest.fn();
    render(
      <FormInput
        {...defaultProps}
        type="password"
        showPasswordToggle={true}
        showPassword={false}
        onTogglePassword={onTogglePassword}
      />
    );
    
    const toggleButton = screen.getByText(/Show/i);
    await user.click(toggleButton);
    expect(onTogglePassword).toHaveBeenCalled();
  });
});
