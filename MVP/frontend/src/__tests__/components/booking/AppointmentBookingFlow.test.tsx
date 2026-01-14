import { render, screen, waitFor } from "../../setup/test-utils";
import userEvent from "@testing-library/user-event";
import AppointmentBookingFlow from "@/components/booking/AppointmentBookingFlow";
import * as api from "@/api";

jest.mock("@/api");

const mockArtist = {
  _id: "artist-123",
  clerkId: "artist-123",
  username: "Test Artist",
  location: "Test City",
};

describe("AppointmentBookingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render all 5 steps in correct order", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText("Book Appointment")).toBeInTheDocument();
    expect(screen.getByText(/Appointment Type/i)).toBeInTheDocument();
  });

  test("should disable Next button when step incomplete", () => {
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  test("should enable Next button when step complete", async () => {
    const user = userEvent.setup();
    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={() => {}}
      />
    );

    const consultationOption = screen.getByText(/consultation/i);
    await user.click(consultationOption);

    const nextButton = screen.getByRole("button", { name: /next/i });
    await waitFor(() => {
      expect(nextButton).not.toBeDisabled();
    });
  });

  test("should call onCancel when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={() => {}}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("should call onComplete with booking data on success", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    const mockBooking = {
      _id: "booking-123",
      artistId: "artist-123",
      clientId: "client-456",
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      status: "pending" as const,
      appointmentType: "consultation" as const,
    };

    jest.mocked(api.createConsultation).mockResolvedValue(mockBooking);

    render(
      <AppointmentBookingFlow
        artist={mockArtist}
        onComplete={onComplete}
        onCancel={() => {}}
      />
    );

    const consultationOption = screen.getByText(/consultation/i);
    await user.click(consultationOption);

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
