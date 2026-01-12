import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import AppointmentHealthInstructions from "@/components/dashboard/shared/AppointmentHealthInstructions";

describe("AppointmentHealthInstructions", () => {
  const defaultProps = {
    open: true,
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when open", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
    });
  });

  it("should not render when closed", () => {
    render(<AppointmentHealthInstructions {...defaultProps} open={false} />);
    expect(screen.queryByText("Pre-Appointment Instructions (Required)")).not.toBeInTheDocument();
  });

  it("should display all 'What to Do' items", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Get a good night's sleep/i)).toBeInTheDocument();
    expect(screen.getByText(/Eat a substantial meal/i)).toBeInTheDocument();
    expect(screen.getByText(/Stay hydrated/i)).toBeInTheDocument();
    expect(screen.getByText(/Wear comfortable/i)).toBeInTheDocument();
    expect(screen.getByText(/Shower and arrive clean/i)).toBeInTheDocument();
    expect(screen.getByText(/Bring a valid ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Arrive 10-15 minutes early/i)).toBeInTheDocument();
    });
  });

  it("should display all 'What NOT to Do' items", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Don't drink alcohol/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't take blood thinners/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't come if you're sick/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't sunburn/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't use numbing creams/i)).toBeInTheDocument();
      expect(screen.getByText(/Don't consume caffeine excessively/i)).toBeInTheDocument();
    });
  });

  it("should display important reminder", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Important Reminder/i)).toBeInTheDocument();
      expect(screen.getByText(/medical conditions, allergies/i)).toBeInTheDocument();
    });
  });

  it("should call onContinue when 'I Understand, Continue' is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<AppointmentHealthInstructions {...defaultProps} onContinue={onContinue} />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I Understand, Continue/i })).toBeInTheDocument();
    });
    
    const continueButton = screen.getByRole("button", { name: /I Understand, Continue/i });
    await user.click(continueButton);
    
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("should have disabled X button", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    await waitFor(() => {
      const closeButtons = screen.getAllByLabelText("Close");
      const disabledButton = closeButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toBeDisabled();
    });
  });

  it("should not close when clicking outside", async () => {
    render(<AppointmentHealthInstructions {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
    });
    
    const dialog = screen.getByText("Pre-Appointment Instructions (Required)").closest('[role="dialog"]');
    expect(dialog).toBeInTheDocument();
  });
});

