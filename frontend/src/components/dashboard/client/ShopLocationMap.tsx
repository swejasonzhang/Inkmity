import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { loadGoogleMaps, MONO_MAP_STYLE } from "@/lib/googleMaps";

type Props = {
    shop?: string;
    address?: string;
    lat?: number;
    lng?: number;
    city?: string;
};

export default function ShopLocationMap({ shop, address, lat, lng, city }: Props) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [mapOk, setMapOk] = useState(true);
    const hasCoords = typeof lat === "number" && typeof lng === "number";
    const label = (address || city || "").trim();

    useEffect(() => {
        if (!hasCoords || !ref.current) return;
        let cancelled = false;
        loadGoogleMaps()
            .then((google) => {
                if (cancelled || !ref.current) return;
                const pos = { lat: lat as number, lng: lng as number };
                const map = new google.maps.Map(ref.current, {
                    center: pos,
                    zoom: 15,
                    disableDefaultUI: true,
                    gestureHandling: "cooperative",
                    keyboardShortcuts: false,
                    styles: MONO_MAP_STYLE,
                    backgroundColor: "#0d0d0d",
                });
                new google.maps.Marker({
                    map,
                    position: pos,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                        strokeColor: "#000000",
                        strokeWeight: 3,
                    },
                });
            })
            .catch(() => {
                if (!cancelled) setMapOk(false);
            });
        return () => {
            cancelled = true;
        };
    }, [hasCoords, lat, lng]);

    if (!shop && !label && !hasCoords) return null;

    const directionsHref = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : label
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
            : undefined;

    return (
        <section className="w-full">
            <header className="mb-2 sm:mb-3 flex items-end justify-between">
                <h3 className="text-base sm:text-lg font-semibold portfolio-section-title">Where to find them</h3>
                {directionsHref && (
                    <a
                        href={directionsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-app hover:underline underline-offset-2"
                    >
                        <Navigation className="h-3.5 w-3.5" /> Directions
                    </a>
                )}
            </header>

            <div className="relative overflow-hidden rounded-2xl border border-app bg-card">
                {hasCoords && mapOk ? (
                    <div ref={ref} className="h-56 sm:h-64 w-full grayscale" style={{ background: "#0d0d0d" }} />
                ) : (
                    <div className="h-28 w-full grid place-items-center" style={{ background: "var(--elevated)" }}>
                        <MapPin className="h-6 w-6 text-subtle" />
                    </div>
                )}

                <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur">
                    <MapPin className="h-3 w-3" /> Studio
                </span>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10 text-white">
                    {shop && <div className="text-sm font-bold leading-tight truncate">{shop}</div>}
                    {label && <div className="text-xs text-white/75 leading-tight truncate">{label}</div>}
                </div>
            </div>
        </section>
    );
}
