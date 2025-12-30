import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import AftercareInstructions from "@/components/dashboard/shared/AftercareInstructions";

describe("AftercareInstructions", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    appointmentDate: new Date("2024-01-15"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render when open", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Tattoo Aftercare Instructions (Required)")).toBeInTheDocument();
    });
  });

  it("should not render when closed", () => {
    render(<AftercareInstructions {...defaultProps} open={false} />);
    expect(screen.queryByText("Tattoo Aftercare Instructions (Required)")).not.toBeInTheDocument();
  });

  it("should display appointment date when provided", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Appointment Date:/i)).toBeInTheDocument();
    });
  });

  it("should display all aftercare steps", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Keep the bandage on/i)).toBeInTheDocument();
    expect(screen.getByText(/Gently wash with lukewarm water/i)).toBeInTheDocument();
    expect(screen.getByText(/Pat dry with a clean paper towel/i)).toBeInTheDocument();
      expect(screen.getByText(/Apply a thin layer of aftercare ointment/i)).toBeInTheDocument();
    });
  });

  it("should display all 'What to Avoid' items", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Don't pick, scratch, or peel/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't soak in water/i)).toBeInTheDocument();
    expect(screen.getByText(/Avoid direct sunlight/i)).toBeInTheDocument();
      expect(screen.getByText(/Don't apply alcohol/i)).toBeInTheDocument();
    });
  });

  it("should display recommended products", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Second Skin / Tegaderm")).toBeInTheDocument();
    expect(screen.getByText("Aquaphor Healing Ointment")).toBeInTheDocument();
    expect(screen.getByText("A&D Ointment")).toBeInTheDocument();
    expect(screen.getByText("Unscented Lotion")).toBeInTheDocument();
      expect(screen.getByText("Antibacterial Soap")).toBeInTheDocument();
    });
  });

  it("should display healing timeline", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Healing Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Days 1-3:/i)).toBeInTheDocument();
    expect(screen.getByText(/Days 4-7:/i)).toBeInTheDocument();
      expect(screen.getByText(/Weeks 3-4:/i)).toBeInTheDocument();
    });
  });

  it("should display warning signs", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Warning Signs:/i)).toBeInTheDocument();
      expect(screen.getByText(/excessive redness, swelling, pus, fever/i)).toBeInTheDocument();
    });
  });

  it("should call onClose when 'I Understand' is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AftercareInstructions {...defaultProps} onClose={onClose} />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I Understand/i })).toBeInTheDocument();
    });
    
    const understandButton = screen.getByRole("button", { name: /I Understand/i });
    await user.click(understandButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should have disabled X button", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      const closeButtons = screen.getAllByLabelText("Close");
      const disabledButton = closeButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toBeDisabled();
    });
  });

  it("should not close when clicking outside", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AftercareInstructions {...defaultProps} onClose={onClose} />);
    
    await waitFor(() => {
      expect(screen.getByText("Tattoo Aftercare Instructions (Required)")).toBeInTheDocument();
    });
    
    const dialog = screen.getByText("Tattoo Aftercare Instructions (Required)").closest('[role="dialog"]');
    if (dialog) {
      await user.click(dialog);
    }
    
    expect(onClose).not.toHaveBeenCalled();
  });
});

