import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";

const mockLoadGoogleMaps = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@/lib/googleMaps", () => ({
  loadGoogleMaps: mockLoadGoogleMaps,
  MONO_MAP_STYLE: [],
}));

const { default: ShopLocationMap } = await import(
  "@/components/dashboard/client/ShopLocationMap"
);

describe("ShopLocationMap", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("renders nothing without shop, label, or coords", () => {
    const { container } = render(<ShopLocationMap />);
    expect(container.firstChild).toBeNull();
  });

  test("renders shop info and a directions link from an address", () => {
    render(<ShopLocationMap shop="Ink Den" address="1 Main St, NYC" />);
    expect(screen.getByText("Ink Den")).toBeInTheDocument();
    expect(screen.getByText("1 Main St, NYC")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /directions/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining(encodeURIComponent("1 Main St, NYC"))
    );
  });

  test("builds a coordinate-based directions link and initializes the map", async () => {
    const Marker = jest.fn();
    const Map = jest.fn();
    mockLoadGoogleMaps.mockResolvedValue({
      maps: {
        Map,
        Marker,
        SymbolPath: { CIRCLE: 0 },
      },
    });
    render(<ShopLocationMap shop="Ink Den" lat={40.7} lng={-74} />);
    const link = screen.getByRole("link", { name: /directions/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("40.7,-74"));
    await waitFor(() => expect(Map).toHaveBeenCalled());
    expect(Marker).toHaveBeenCalled();
  });

  test("falls back to the placeholder when the map fails to load", async () => {
    mockLoadGoogleMaps.mockRejectedValue(new Error("boom"));
    const { container } = render(
      <ShopLocationMap shop="Ink Den" lat={40.7} lng={-74} />
    );
    await waitFor(() => expect(mockLoadGoogleMaps).toHaveBeenCalled());
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
