let mapsPromise: Promise<any> | null = null;

export function googleMapsKey(): string | undefined {
    return (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
}

export function loadGoogleMaps(): Promise<any> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Google Maps can only load in the browser"));
    }
    const w = window as any;
    if (w.google?.maps?.places) return Promise.resolve(w.google);
    if (mapsPromise) return mapsPromise;

    const key = googleMapsKey();
    if (!key) {
        return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured"));
    }

    mapsPromise = new Promise((resolve, reject) => {
        const callbackName = "__inkmityGoogleMapsReady";
        w[callbackName] = () => resolve(w.google);
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            mapsPromise = null;
            reject(new Error("Failed to load Google Maps"));
        };
        document.head.appendChild(script);
    });
    return mapsPromise;
}

export function cityFromPlace(place: any): string {
    const comps: any[] = place?.address_components || [];
    const pick = (type: string) => comps.find((c) => (c.types || []).includes(type))?.long_name;
    return pick("locality") || pick("postal_town") || pick("sublocality") || pick("administrative_area_level_2") || "";
}

export const MONO_MAP_STYLE: any[] = [
    { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d0d" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#222222" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b2b2b" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#262626" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#555555" }] },
];
