import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: CalendarView } = await import("@/components/dashboard/artist/CalendarView");

describe("CalendarView", () => {
  test("should render calendar view", () => {
    const { container } = render(<CalendarView bookings={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render with bookings", () => {
    const bookings = [
      {
        id: "booking-1",
        title: "Test Booking",
        clientName: "Test Client",
        start: "2024-01-01T10:00:00Z",
        end: "2024-01-01T12:00:00Z",
        status: "confirmed",
      },
    ];
    const { container } = render(<CalendarView bookings={bookings} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
