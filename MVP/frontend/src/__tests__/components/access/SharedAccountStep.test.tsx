import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import React from "react";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: SharedAccountStep } = await import("@/components/access/SharedAccountStep");

describe("SharedAccountStep", () => {
  const defaultProps = {
    role: "client" as const,
    setRole: jest.fn<(r: "client" | "artist") => void>(),
    shared: {
      username: "",
      email: "",
      password: "",
    },
    onChange: jest.fn<React.ChangeEventHandler<HTMLInputElement>>(),
    setConfirmPassword: jest.fn<(v: string) => void>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render shared account step", () => {
    render(<SharedAccountStep {...defaultProps} />);
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    const passwordInputs = screen.getAllByLabelText(/Password/i);
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  test("should call onChange when username is entered", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SharedAccountStep {...defaultProps} onChange={onChange} />);
    
    const usernameInput = screen.getByLabelText(/Username/i);
    await user.type(usernameInput, "testuser");
    expect(onChange).toHaveBeenCalled();
  });

  test("should toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<SharedAccountStep {...defaultProps} shared={{ ...defaultProps.shared, password: "password123" }} />);
    
    const passwordInputs = screen.getAllByLabelText(/Password/i);
    const passwordInput = passwordInputs[0];
    const toggleButton = screen.getByLabelText(/Show password/i);
    
    expect(passwordInput).toHaveAttribute("type", "password");
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("should call setRole when role button is clicked", async () => {
    const user = userEvent.setup();
    const setRole = jest.fn();
    render(<SharedAccountStep {...defaultProps} setRole={setRole} />);
    
    const artistButton = screen.getByText(/I'm an artist/i);
    await user.click(artistButton);
    expect(setRole).toHaveBeenCalledWith("artist");
  });
});
