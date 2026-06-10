import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/header/Header";
import { useTheme } from "@/hooks/useTheme";
import { fetchArtistByHandle } from "@/api";
import FullscreenZoom from "@/components/dashboard/client/FullscreenZoom";

type AnyArtist = Record<string, any>;

export default function ArtistWorks() {
    const { handle = "" } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();

    const stateArtist = (location.state as { artist?: AnyArtist } | null)?.artist ?? null;
    const [artist, setArtist] = useState<AnyArtist | null>(stateArtist);
    const [loading, setLoading] = useState<boolean>(!stateArtist);
    const [zoom, setZoom] = useState<number | null>(null);

    const shellBg = theme === "light" ? "#ffffff" : "#0b0b0b";
    const shellFg = theme === "light" ? "#111111" : "#f5f5f5";

    useEffect(() => {
        if (artist) return;
        let active = true;
        (async () => {
            try {
                const a = await fetchArtistByHandle(handle);
                if (active) setArtist(a as AnyArtist);
            } catch {} finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [handle, artist]);

    const works = useMemo(() => {
        if (!artist) return [] as { src: string; label: string }[];
        const cats: [string, unknown][] = [
            ["Recent", artist.portfolioImages],
            ["Past", artist.pastWorks],
            ["Healed", artist.healedWorks],
            ["Flash & Sketches", artist.sketches],
        ];
        const out: { src: string; label: string }[] = [];
        for (const [label, arr] of cats) {
            (Array.isArray(arr) ? arr : []).filter(Boolean).forEach((src: string) => out.push({ src, label }));
        }
        return out;
    }, [artist]);

    const images = useMemo(() => works.map((w) => w.src), [works]);
    const displayHandle = String(artist?.handle || handle).replace(/^@/, "");

    return (
        <div id="dashboard-scope" className="ink-scope min-h-dvh flex flex-col" style={{ background: shellBg, color: shellFg }}>
            <Header />
            <main className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "clamp(14px, 2.5vw, 36px)" }}>
                <div className="mx-auto w-full max-w-6xl">
                    <button
                        onClick={() => {
                            if (artist?._id) navigate("/dashboard", { state: { reopenArtistId: artist._id, reopenArtist: artist } });
                            else navigate(-1);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full border px-3 py-1.5 mb-4 transition hover:brightness-110"
                        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    {loading ? (
                        <p className="text-center text-subtle py-12">Loading…</p>
                    ) : !artist ? (
                        <p className="text-center text-subtle py-12">Artist not found.</p>
                    ) : (
                        <>
                            <header className="mb-5 text-center">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app">{artist.username}</h1>
                                <p className="text-subtle text-sm mt-1">@{displayHandle} · {works.length} work{works.length === 1 ? "" : "s"}</p>
                            </header>

                            {works.length === 0 ? (
                                <p className="text-center text-subtle py-12">No works to show yet.</p>
                            ) : (
                                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {works.map((w, i) => (
                                        <button
                                            key={`${w.src}-${i}`}
                                            onClick={() => setZoom(i)}
                                            className="group relative aspect-square rounded-xl overflow-hidden border"
                                            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                            aria-label={`Open ${w.label} work ${i + 1}`}
                                        >
                                            <img
                                                src={w.src}
                                                alt={`${w.label} work ${i + 1}`}
                                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                                decoding="async"
                                                referrerPolicy="no-referrer"
                                            />
                                            <span
                                                className="absolute left-1.5 bottom-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md border"
                                                style={{ background: "color-mix(in srgb, var(--card) 80%, transparent)", borderColor: "color-mix(in srgb, var(--fg) 25%, transparent)", color: "var(--fg)" }}
                                            >
                                                {w.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {zoom !== null && images.length > 0 && (
                <FullscreenZoom
                    src={images[zoom]}
                    count={`${works[zoom]?.label}: ${zoom + 1} / ${images.length}`}
                    onPrev={() => setZoom((z) => (z === null ? z : (z + images.length - 1) % images.length))}
                    onNext={() => setZoom((z) => (z === null ? z : (z + 1) % images.length))}
                    onClose={() => setZoom(null)}
                />
            )}
        </div>
    );
}
