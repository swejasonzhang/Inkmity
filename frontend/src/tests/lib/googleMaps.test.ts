import { describe, test, expect, afterEach } from "@jest/globals";
import {
  cityFromPlace,
  MONO_MAP_STYLE,
  googleMapsKey,
  loadGoogleMaps,
} from "@/lib/googleMaps";

describe("cityFromPlace", () => {
  function comp(types: string[], long_name: string) {
    return { types, long_name };
  }

  test("prefers locality", () => {
    const place = {
      address_components: [
        comp(["locality"], "Brooklyn"),
        comp(["postal_town"], "Town"),
      ],
    };
    expect(cityFromPlace(place)).toBe("Brooklyn");
  });

  test("falls back through postal_town, sublocality, admin level 2", () => {
    expect(
      cityFromPlace({ address_components: [comp(["postal_town"], "Reading")] })
    ).toBe("Reading");
    expect(
      cityFromPlace({ address_components: [comp(["sublocality"], "SoHo")] })
    ).toBe("SoHo");
    expect(
      cityFromPlace({
        address_components: [comp(["administrative_area_level_2"], "Kings County")],
      })
    ).toBe("Kings County");
  });

  test("returns empty string for missing or unmatched data", () => {
    expect(cityFromPlace(null)).toBe("");
    expect(cityFromPlace({})).toBe("");
    expect(cityFromPlace({ address_components: [comp(["country"], "USA")] })).toBe("");
    expect(cityFromPlace({ address_components: [{}] })).toBe("");
  });
});

describe("googleMapsKey", () => {
  test("returns the configured key or undefined", () => {
    const key = googleMapsKey();
    expect(key === undefined || typeof key === "string").toBe(true);
  });
});

describe("MONO_MAP_STYLE", () => {
  test("is a non-empty monochrome style array", () => {
    expect(Array.isArray(MONO_MAP_STYLE)).toBe(true);
    expect(MONO_MAP_STYLE.length).toBeGreaterThan(0);
    for (const rule of MONO_MAP_STYLE) {
      expect(Array.isArray(rule.stylers)).toBe(true);
    }
  });
});

describe("loadGoogleMaps", () => {
  afterEach(() => {
    delete (window as any).google;
    document.head.innerHTML = "";
    delete (window as any).__inkmityGoogleMapsReady;
  });

  test("resolves immediately when the places library is already present", async () => {
    const google = { maps: { places: {} } };
    (window as any).google = google;
    await expect(loadGoogleMaps()).resolves.toBe(google);
    expect(document.head.querySelector("script")).toBeNull();
  });

  test("rejects when no API key is configured", async () => {
    await expect(loadGoogleMaps()).rejects.toThrow(
      "VITE_GOOGLE_MAPS_API_KEY is not configured"
    );
  });

});
