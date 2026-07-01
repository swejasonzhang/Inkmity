import { describe, test, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@/tests/setup/test-utils";
import AvailabilityEditor from "@/components/calendar/AvailabilityEditor";

const initial: any = {
  timezone: "America/New_York",
  slotMinutes: 60,
  weekly: {
    sun: [],
    mon: [{ start: "09:00", end: "17:00" }],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
  },
  exceptions: [],
};

describe("AvailabilityEditor", () => {
  test("shows the seeded hours for the active weekday", () => {
    render(<AvailabilityEditor artistId="a1" initial={initial} />);
    expect(screen.getByText(/09:00.*17:00/)).toBeInTheDocument();
  });

  test("switching to a weekday with no hours shows the empty state", () => {
    render(<AvailabilityEditor artistId="a1" initial={initial} />);
    fireEvent.click(screen.getByRole("button", { name: "Tue" }));
    expect(screen.getByText(/No hours set for this weekday yet/i)).toBeInTheDocument();
  });

  test("removing a range clears the day's hours", () => {
    render(<AvailabilityEditor artistId="a1" initial={initial} />);
    expect(screen.getByText(/09:00.*17:00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(/No hours set for this weekday yet/i)).toBeInTheDocument();
  });
});
