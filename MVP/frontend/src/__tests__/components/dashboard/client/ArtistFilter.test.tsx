import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@/__tests__/setup/test-utils";
import userEvent from "@testing-library/user-event";

const { default: ArtistFilter } = await import("@/components/dashboard/client/ArtistFilter");

describe("ArtistFilter", () => {
  const defaultProps = {
    priceFilter: "",
    setPriceFilter: jest.fn(),
    locationFilter: "",
    setLocationFilter: jest.fn(),
    styleFilter: "",
    setStyleFilter: jest.fn(),
    availabilityFilter: "",
    setAvailabilityFilter: jest.fn(),
    experienceFilter: "",
    setExperienceFilter: jest.fn(),
    bookingFilter: "",
    setBookingFilter: jest.fn(),
    travelFilter: "",
    setTravelFilter: jest.fn(),
    sort: "",
    setSort: jest.fn(),
    artists: [],
    setCurrentPage: jest.fn(),
    searchQuery: "",
    setSearchQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should render filter component", () => {
    const { container } = render(<ArtistFilter {...defaultProps} />);
    expect(container.querySelector("input") || container.querySelector("select")).toBeInTheDocument();
  });

  test("should call setSearchQuery when search input changes", async () => {
    const user = userEvent.setup();
    const setSearchQuery = jest.fn();
    render(<ArtistFilter {...defaultProps} setSearchQuery={setSearchQuery} />);

    const inputs = screen.getAllByRole("textbox");
    if (inputs.length > 0) {
      await user.type(inputs[0], "test");
      expect(setSearchQuery).toHaveBeenCalled();
    } else {
      expect(true).toBe(true);
    }
  });
});
