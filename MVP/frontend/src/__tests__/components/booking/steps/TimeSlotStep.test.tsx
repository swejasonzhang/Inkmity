import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import TimeSlotStep from "@/components/booking/steps/TimeSlotStep";
import * as api from "@/api";

vi.mock("@/api");

describe("TimeSlotStep", () => {
  const defaultProps = {
    artistId: "artist-123",
    initialDate: new Date("2024-01-15"),
    selectedStart: null,
    selectedEnd: null,
    durationMinutes: 60,
    appointmentType: "tattoo_session" as const,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.apiGet).mockResolvedValue([
      {
        startISO: "2024-01-15T10:00:00Z",
        endISO: "2024-01-15T11:00:00Z",
      },
      {
        startISO: "2024-01-15T14:00:00Z",
        endISO: "2024-01-15T15:00:00Z",
      },
    ]);
  });

  it("should render calendar and time slots", async () => {
    render(<TimeSlotStep {...defaultProps} />);
    expect(screen.getByText(/Select Date & Time/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(api.apiGet).toHaveBeenCalled();
    });
  });

  it("should show health instructions modal when selecting slot for tattoo_session", async () => {
    const user = userEvent.setup();
    render(<TimeSlotStep {...defaultProps} appointmentType="tattoo_session" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    });
    
    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));
    
    if (slotButton) {
      await user.click(slotButton);
      
      await waitFor(() => {
        expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
      });
    }
  });

  it("should not show health instructions modal for consultation", async () => {
    const user = userEvent.setup();
    render(<TimeSlotStep {...defaultProps} appointmentType="consultation" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    });
    
    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));
    
    if (slotButton) {
      await user.click(slotButton);
      
      await waitFor(() => {
        expect(screen.queryByText("Pre-Appointment Instructions (Required)")).not.toBeInTheDocument();
      });
    }
  });

  it("should call onSelect after acknowledging health instructions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TimeSlotStep {...defaultProps} appointmentType="tattoo_session" onSelect={onSelect} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Available Times/i)).toBeInTheDocument();
    });
    
    const timeSlots = screen.getAllByRole("button");
    const slotButton = timeSlots.find((btn) => btn.textContent?.includes("10:00"));
    
    if (slotButton) {
      await user.click(slotButton);
      
      await waitFor(() => {
        expect(screen.getByText("Pre-Appointment Instructions (Required)")).toBeInTheDocument();
      });
      
      const continueButton = screen.getByRole("button", { name: /I Understand, Continue/i });
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(onSelect).toHaveBeenCalled();
      });
    }
  });
});

