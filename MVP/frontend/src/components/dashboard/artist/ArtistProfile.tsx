import React, { useState, useEffect, useMemo } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Artist {
    _id: string;
    username: string;
    bio?: string;
    location?: string;
    style?: string[] | string;
    styles?: string[] | string;
    priceRange?: { min: number; max: number };
    rating?: number;
    reviewsCount?: number;
    yearsExperience?: number;
    baseRate?: number;
    profileImage?: string;
    coverImage?: string;
    portfolioImages?: string[];
    pastWorks?: string[];
    healedWorks?: string[];
    sketches?: string[];
    clerkId?: string;
    bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
    travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
    shop?: string;
    shopName?: string;
}

export default function ArtistProfile() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [avatarOk, setAvatarOk] = useState(false);
    const [bgOk, setBgOk] = useState(false);
    const [artist, setArtist] = useState<Artist | null>(null);
    const [editedArtist, setEditedArtist] = useState<Partial<Artist>>({});

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const token = await getToken();
            const response = await fetch(`${API_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) throw new Error("Failed to load profile");
            const data = await response.json();
            const artistData: Artist = {
                _id: data._id || "",
                username: data.username || "",
                bio: data.bio || "",
                location: data.location || "",
                styles: Array.isArray(data.styles) ? data.styles : [],
                yearsExperience: data.yearsExperience || 0,
                baseRate: data.baseRate || 0,
                profileImage: data.profileImage || data.avatarUrl || "",
                coverImage: data.coverImage || "",
                portfolioImages: Array.isArray(data.portfolioImages) ? data.portfolioImages : [],
                bookingPreference: data.bookingPreference || "open",
                travelFrequency: data.travelFrequency || "rare",
                shop: data.shop || "",
                shopName: data.shopName || data.shop || "",
            };
            setArtist(artistData);
            setAvatarOk(Boolean(artistData.profileImage));
            setBgOk(Boolean(artistData.coverImage));
        } catch (error) {
            console.error("Failed to load profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        if (!user || !artist) return;
        try {
            setSaving(true);
            const token = await getToken();
            const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
            const username = editedArtist.username || artist.username || user.firstName || email.split("@")[0] || "user";
            const response = await fetch(`${API_URL}/users/sync`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clerkId: user.id,
                    email,
                    role: "artist",
                    username,
                    profile: {
                        location: editedArtist.location ?? artist.location,
                        years: editedArtist.yearsExperience ?? artist.yearsExperience,
                        baseRate: editedArtist.baseRate ?? artist.baseRate,
                        bookingPreference: editedArtist.bookingPreference ?? artist.bookingPreference,
                        travelFrequency: editedArtist.travelFrequency ?? artist.travelFrequency,
                        styles: editedArtist.styles ?? artist.styles,
                        shop: editedArtist.shop ?? artist.shop,
                    },
                    bio: editedArtist.bio ?? artist.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");
            const data = await response.json();
            const updatedArtist: Artist = {
                _id: data._id || artist._id,
                username: data.username || artist.username,
                bio: data.bio || artist.bio,
                location: data.location || artist.location,
                styles: Array.isArray(data.styles) ? data.styles : artist.styles || [],
                yearsExperience: data.yearsExperience ?? artist.yearsExperience,
                baseRate: data.baseRate ?? artist.baseRate,
                profileImage: data.profileImage || data.avatarUrl || artist.profileImage,
                coverImage: data.coverImage || artist.coverImage,
                portfolioImages: Array.isArray(data.portfolioImages) ? data.portfolioImages : artist.portfolioImages || [],
                bookingPreference: data.bookingPreference || artist.bookingPreference,
                travelFrequency: data.travelFrequency || artist.travelFrequency,
                shop: data.shop || artist.shop,
                shopName: data.shopName || data.shop || artist.shopName,
            };
            setArtist(updatedArtist);
            setEditedArtist({});
            setEditing(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const portfolio = useMemo(() => (artist?.portfolioImages || []).filter(Boolean), [artist?.portfolioImages]);
    const healedWorks = artist?.healedWorks?.length ? artist.healedWorks : [];
    const sketches = artist?.sketches?.length ? artist.sketches : [];

    const initials = useMemo(() => (artist?.username || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [artist?.username]);

    const bioText = (artist?.bio || "").trim() || `Nice to meet you, I'm ${artist?.username || "this artist"}, let's talk about your next tattoo.`;

    const stylesClean = useMemo(() => {
        if (!artist) return [];
        const raw = (artist as any).styles ?? artist.style ?? [];
        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
        return arr.map(s => String(s).trim()).filter(Boolean);
    }, [artist]);

    const stylesPrimary = stylesClean.slice(0, 3);
    const stylesOverflow = Math.max(0, stylesClean.length - stylesPrimary.length);

    const Grid: React.FC<{ images: string[]; eager?: number }> = ({ images, eager = 6 }) =>
        images.length ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                {images.map((src, i) => (
                    <div
                        key={`${src}-${i}`}
                        className="relative aspect-square w-full overflow-hidden rounded-xl border"
                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                    >
                        <img
                            src={src}
                            alt={`Work ${i + 1}`}
                            className="h-full w-full object-cover"
                            loading={i < eager ? "eager" : "lazy"}
                            decoding="async"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                ))}
            </div>
        ) : null;

    const chip = (text: string, key?: string | number) => (
        <span
            key={key ?? text}
            className="rounded-full px-2.5 py-1 border"
            style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
        >
            {text}
        </span>
    );

    const shopLabel = artist?.shopName || artist?.shop || "";
    const years = typeof artist?.yearsExperience === "number" && artist.yearsExperience >= 0 ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"} exp` : "";
    const loc = artist?.location?.trim() || "";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/60">Loading profile...</div>
            </div>
        );
    }

    if (!artist) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/60">No profile data available</div>
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 w-full overflow-y-auto">
            <div className="group w-full h-full flex flex-col overflow-hidden rounded-3xl bg-card/90 transition" data-artist-card="true">
                <div className="relative w-full flex-shrink-0">
                    <div className="relative w-full h-[18rem] sm:h-[16rem] md:h-[20rem] overflow-hidden" style={{ background: "var(--elevated)" }}>
                        {bgOk && artist.coverImage ? (
                            <img
                                src={artist.coverImage}
                                alt={`${artist.username} background`}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => setBgOk(false)}
                            />
                        ) : (
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
                        )}
                        <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "6rem", background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] sm:-translate-y-1/2 grid place-items-center gap-2">
                            <div className="relative rounded-full overflow-hidden h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 shadow-2xl ring-2 ring-[color:var(--card)]" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
                                {avatarOk && artist.profileImage ? (
                                    <img
                                        src={artist.profileImage}
                                        alt={`${artist.username} profile`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={() => setAvatarOk(false)}
                                    />
                                ) : (
                                    <span className="absolute inset-0 grid place-items-center text-3xl sm:text-4xl font-semibold" style={{ color: "var(--fg)" }}>
                                        {initials}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 sm:px-6 pt-2 pb-6 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto items-center justify-center">
                    <div className="flex flex-col items-center text-center gap-3 sm:gap-4 w-full max-w-2xl">
                        <div className="flex items-center gap-2">
                            {editing ? (
                                <input
                                    type="text"
                                    value={editedArtist.username ?? artist.username}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                                    className="font-extrabold tracking-tight text-2xl md:text-3xl bg-transparent border-b-2 border-white/20 focus:outline-none focus:border-white/40 text-center"
                                    style={{ color: "var(--fg)" }}
                                />
                            ) : (
                                <h2 className="font-extrabold tracking-tight text-2xl md:text-3xl" style={{ color: "var(--fg)" }}>
                                    {artist.username}
                                </h2>
                            )}
                            <Button
                                onClick={() => {
                                    if (editing) {
                                        saveProfile();
                                    } else {
                                        setEditing(true);
                                        setEditedArtist({});
                                    }
                                }}
                                disabled={saving}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                            >
                                {editing ? (
                                    <Save className="h-4 w-4" />
                                ) : (
                                    <Edit2 className="h-4 w-4" />
                                )}
                            </Button>
                        </div>

                        <p className="text-sm md:text-base leading-relaxed max-w-prose mt-1.5 md:mt-2" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                            {editing ? (
                                <textarea
                                    value={editedArtist.bio ?? bioText}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, bio: e.target.value })}
                                    className="w-full bg-transparent border border-white/20 rounded-lg p-2 focus:outline-none focus:border-white/40 resize-none"
                                    rows={3}
                                    style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}
                                />
                            ) : (
                                bioText
                            )}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
                            {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
                            {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
                            {shopLabel && chip(shopLabel, "shop")}
                            {years && chip(years, "years")}
                            {loc && chip(loc, "loc")}
                        </div>
                    </div>

                    {portfolio.length > 0 && (
                        <div className="mt-3">
                            <Grid images={portfolio} />
                        </div>
                    )}

                    {healedWorks.length > 0 && (
                        <div className="mt-2">
                            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>
                                Healed Works
                            </h4>
                            <Grid images={healedWorks} />
                        </div>
                    )}

                    {sketches.length > 0 && (
                        <div className="mt-2">
                            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>
                                Sketches
                            </h4>
                            <Grid images={sketches} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
