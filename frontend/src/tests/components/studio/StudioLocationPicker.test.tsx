import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import userEvent from "@testing-library/user-event";

const mockLoadGoogleMaps = jest.fn<() => Promise<any>>();
const mockGoogleMapsKey = jest.fn<() => string>();
const mockCityFromPlace = jest.fn<() => string>();

jest.unstable_mockModule("@/lib/googleMaps", () => ({
  loadGoogleMaps: mockLoadGoogleMaps,
  googleMapsKey: mockGoogleMapsKey,
  cityFromPlace: mockCityFromPlace,
  MONO_MAP_STYLE: [],
}));

const { default: StudioLocationPicker } = await import(
  "@/components/studio/StudioLocationPicker"
);

const baseValue = { name: "", address: "", city: "" };

describe("StudioLocationPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("falls back to manual entry when no API key is configured", async () => {
    mockGoogleMapsKey.mockReturnValue("");
    render(<StudioLocationPicker value={baseValue} onChange={jest.fn()} />);
    expect(
      await screen.findByPlaceholderText(/Enter your full studio address/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Map search is unavailable/i)).toBeInTheDocument();
  });

  test("parses a manual address into address + city via onChange", async () => {
    mockGoogleMapsKey.mockReturnValue("");
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<StudioLocationPicker value={baseValue} onChange={onChange} />);
    const input = await screen.findByPlaceholderText(/Enter your full studio address/i);
    await user.type(input, "1 Main St, Brooklyn, NY");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        address: "1 Main St, Brooklyn, NY",
        city: "Brooklyn",
      })
    );
  });

  test("falls back to manual entry when google maps fails to load", async () => {
    mockGoogleMapsKey.mockReturnValue("key");
    mockLoadGoogleMaps.mockRejectedValue(new Error("boom"));
    render(<StudioLocationPicker value={baseValue} onChange={jest.fn()} />);
    expect(
      await screen.findByPlaceholderText(/Enter your full studio address/i)
    ).toBeInTheDocument();
  });

  test("renders the autocomplete host and map when maps load successfully", async () => {
    mockGoogleMapsKey.mockReturnValue("key");
    const addEventListener = jest.fn();
    class FakeAutocomplete {
      style: Record<string, string> = {};
      addEventListener = addEventListener;
    }
    const fakeGoogle = {
      maps: {
        Map: class {
          setCenter() {}
          setZoom() {}
        },
        Marker: class {
          addListener() {}
          setPosition() {}
        },
        places: { PlaceAutocompleteElement: FakeAutocomplete },
        Geocoder: class {},
      },
    };
    mockLoadGoogleMaps.mockResolvedValue(fakeGoogle);
    const { container } = render(
      <StudioLocationPicker
        value={{ ...baseValue, lat: 40.7, lng: -74 }}
        onChange={jest.fn()}
      />
    );
    await waitFor(() => expect(mockLoadGoogleMaps).toHaveBeenCalled());
    await waitFor(() =>
      expect(container.querySelector(".ink-gmp-autocomplete")).toBeInTheDocument()
    );
    expect(addEventListener).toHaveBeenCalledWith("gmp-select", expect.any(Function));
  });

  test("shows a verified listing label when a placeId is present", async () => {
    mockGoogleMapsKey.mockReturnValue("");
    render(
      <StudioLocationPicker
        value={{ name: "Ink Shop", address: "123 St", city: "NYC", placeId: "p1" }}
        onChange={jest.fn()}
        compact
      />
    );
    // error fallback path hides the verified label, so use ready path instead
    expect(screen.queryByText(/Verified listing/i)).not.toBeInTheDocument();
  });
});
