import { render, screen, waitFor } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";
import AftercareInstructions from "@/components/dashboard/shared/AftercareInstructions";

describe("AftercareInstructions", () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    appointmentDate: new Date("2024-01-15"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render when open", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Tattoo Aftercare Instructions (Required)")).toBeInTheDocument();
    });
  });

  test("should not render when closed", () => {
    render(<AftercareInstructions {...defaultProps} open={false} />);
    expect(screen.queryByText("Tattoo Aftercare Instructions (Required)")).not.toBeInTheDocument();
  });

  test("should display appointment date when provided", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Appointment Date:/i)).toBeInTheDocument();
    });
  });

  test("should display all aftercare steps", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Keep the bandage on/i)).toBeInTheDocument();
    expect(screen.getByText(/Gently wash with lukewarm water/i)).toBeInTheDocument();
    expect(screen.getByText(/Pat dry with a clean paper towel/i)).toBeInTheDocument();
      expect(screen.getByText(/Apply a thin layer of aftercare ointment/i)).toBeInTheDocument();
    });
  });

  test("should display all 'What to Avoid' items", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Don't pick, scratch, or peel/i)).toBeInTheDocument();
    expect(screen.getByText(/Don't soak in water/i)).toBeInTheDocument();
    expect(screen.getByText(/Avoid direct sunlight/i)).toBeInTheDocument();
      expect(screen.getByText(/Don't apply alcohol/i)).toBeInTheDocument();
    });
  });

  test("should display recommended products", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Second Skin / Tegaderm")).toBeInTheDocument();
    expect(screen.getByText("Aquaphor Healing Ointment")).toBeInTheDocument();
    expect(screen.getByText("A&D Ointment")).toBeInTheDocument();
    expect(screen.getByText("Unscented Lotion")).toBeInTheDocument();
      expect(screen.getByText("Antibacterial Soap")).toBeInTheDocument();
    });
  });

  test("should display healing timeline", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Healing Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Days 1-3:/i)).toBeInTheDocument();
    expect(screen.getByText(/Days 4-7:/i)).toBeInTheDocument();
      expect(screen.getByText(/Weeks 3-4:/i)).toBeInTheDocument();
    });
  });

  test("should display warning signs", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Warning Signs:/i)).toBeInTheDocument();
      expect(screen.getByText(/excessive redness, swelling, pus, fever/i)).toBeInTheDocument();
    });
  });

  test("should call onClose when 'I Understand' is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<AftercareInstructions {...defaultProps} onClose={onClose} />);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /I Understand/i })).toBeInTheDocument();
    });
    
    const understandButton = screen.getByRole("button", { name: /I Understand/i });
    await user.click(understandButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("should have disabled X button", async () => {
    render(<AftercareInstructions {...defaultProps} />);
    await waitFor(() => {
      const closeButtons = screen.getAllByLabelText("Close");
      const disabledButton = closeButtons.find(btn => btn.hasAttribute('disabled'));
      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toBeDisabled();
    });
  });

  test("should not close when clicking outside", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
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

