import { useEffect, useRef, useState } from "react";
import { MapPin, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import { loadGoogleMaps, googleMapsKey, cityFromPlace, MONO_MAP_STYLE } from "@/lib/googleMaps";

export type StudioLocation = {
    name?: string;
    address: string;
    city: string;
    lat?: number;
    lng?: number;
    placeId?: string;
};

type Props = {
    value: StudioLocation;
    onChange: (next: StudioLocation) => void;
    compact?: boolean;
};

export default function StudioLocationPicker({ value, onChange, compact = false }: Props) {
    const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
    const mapElRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const googleRef = useRef<any>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const hasKey = Boolean(googleMapsKey());

    const MANUAL_MSG = "Map search is unavailable right now — type your full studio address above and we'll save it.";

    useEffect(() => {
        if (!hasKey) {
            console.warn("[maps] VITE_GOOGLE_MAPS_API_KEY is not set — falling back to manual address entry.");
            setStatus("error");
            setError(MANUAL_MSG);
            return;
        }
        let cancelled = false;
        setStatus("loading");

        (window as any).gm_authFailure = () => {
            if (cancelled) return;
            console.warn(
                "[maps] Google rejected the key. In Google Cloud: enable Maps JavaScript API + Places API, add this domain (incl. www) to the key's HTTP-referrer restrictions, and confirm billing is on."
            );
            setStatus("error");
            setError(MANUAL_MSG);
        };

        loadGoogleMaps()
            .then((google) => {
                if (cancelled) return;
                googleRef.current = google;
                initMap(google);
                initAutocomplete(google);
                setStatus("ready");
            })
            .catch((e) => {
                if (cancelled) return;
                console.warn("[maps] failed to load Google Maps:", e?.message || e);
                setStatus("error");
                setError(MANUAL_MSG);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasKey]);

    const onManualAddress = (raw: string) => {
        const address = raw.trim();
        const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
        const city = parts.length >= 2 ? parts[parts.length - 2] : address;
        onChange({ address, city, lat: undefined, lng: undefined, placeId: undefined });
    };

    const placeMarker = (google: any, lat: number, lng: number) => {
        if (!mapRef.current) return;
        const pos = { lat, lng };
        if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({
                map: mapRef.current,
                position: pos,
                draggable: true,
            });
            markerRef.current.addListener("dragend", () => {
                const p = markerRef.current.getPosition();
                reverseGeocode(google, p.lat(), p.lng());
            });
        } else {
            markerRef.current.setPosition(pos);
        }
        mapRef.current.setCenter(pos);
        mapRef.current.setZoom(16);
    };

    const initMap = (google: any) => {
        if (!mapElRef.current) return;
        const start =
            value.lat != null && value.lng != null
                ? { lat: value.lat, lng: value.lng }
                : { lat: 40.7128, lng: -74.006 };
        mapRef.current = new google.maps.Map(mapElRef.current, {
            center: start,
            zoom: value.lat != null ? 16 : 11,
            disableDefaultUI: true,
            zoomControl: true,
            styles: MONO_MAP_STYLE,
            backgroundColor: "#0d0d0d",
        });
        if (value.lat != null && value.lng != null) {
            placeMarker(google, value.lat, value.lng);
        }
    };

    const cityFromComponents = (comps: any[]): string => {
        const arr = comps || [];
        const pick = (type: string) => arr.find((c) => (c.types || []).includes(type))?.longText;
        return pick("locality") || pick("postal_town") || pick("sublocality") || pick("administrative_area_level_2") || "";
    };

    const initAutocomplete = (google: any) => {
        const host = autocompleteHostRef.current;
        if (!host) return;
        const pac = new google.maps.places.PlaceAutocompleteElement();
        (pac as any).style.width = "100%";
        host.replaceChildren(pac);
        pac.addEventListener("gmp-select", async (event: any) => {
            const place = event?.placePrediction?.toPlace?.();
            if (!place) return;
            await place.fetchFields({ fields: ["formattedAddress", "location", "addressComponents", "id", "displayName"] });
            const loc = place.location;
            const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
            const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
            if (lat != null && lng != null) placeMarker(google, lat, lng);
            onChange({
                name: place.displayName || "",
                address: place.formattedAddress || place.displayName || "",
                city: cityFromComponents(place.addressComponents),
                lat: lat ?? undefined,
                lng: lng ?? undefined,
                placeId: place.id,
            });
        });
    };

    const reverseGeocode = (google: any, lat: number, lng: number) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any[], st: string) => {
            const top = st === "OK" && results?.[0];
            onChange({
                address: top ? top.formatted_address : value.address,
                city: top ? cityFromPlace(top) : value.city,
                lat,
                lng,
                placeId: top ? top.place_id : value.placeId,
            });
        });
    };

    return (
        <div className="space-y-2">
            {status === "error" ? (
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        defaultValue={value.address}
                        placeholder="Enter your full studio address…"
                        onChange={(e) => onManualAddress(e.target.value)}
                        className="w-full rounded-lg border border-app bg-elevated py-2.5 pl-9 pr-3 text-sm text-app placeholder:text-muted outline-none transition-colors focus:border-[color:var(--fg)]/40"
                    />
                </div>
            ) : (
                <div className="relative ink-gmp-autocomplete">
                    {status === "loading" && (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">Loading maps…</span>
                    )}
                    <div ref={autocompleteHostRef} className="w-full" />
                </div>
            )}

            {status === "error" ? (
                <div className="flex items-start gap-2 rounded-lg border border-app bg-elevated px-3 py-2 text-[11px] text-muted">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : (
                <>
                    {!compact && (
                        <div
                            ref={mapElRef}
                            className="h-52 w-full overflow-hidden rounded-xl border border-app bg-[#0d0d0d]"
                            aria-label="Studio location map"
                        />
                    )}
                    {value.placeId ? (
                        <div className="flex items-center gap-2 text-[11px] text-app">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="font-medium">Verified listing</span>
                            <span className="text-muted">· {value.address}</span>
                        </div>
                    ) : value.lat != null ? (
                        <div className="flex items-center gap-2 text-[11px] text-muted">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Pin set — drag it to fine-tune the exact spot.</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-muted">
                            Search for your shop above to confirm it&apos;s a real, listed location.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
