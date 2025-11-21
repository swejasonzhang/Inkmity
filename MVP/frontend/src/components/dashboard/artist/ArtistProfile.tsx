import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Edit2, Upload, X, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/cloudinary";

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
    avatar?: { url?: string; publicId?: string };
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
    const [uploading, setUploading] = useState(false);
    const [newStyleInput, setNewStyleInput] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const portfolioInputRef = useRef<HTMLInputElement>(null);

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
                profileImage: data.avatar?.url || data.profileImage || data.avatarUrl || "",
                coverImage: data.coverImage || "",
                portfolioImages: Array.isArray(data.portfolioImages) ? data.portfolioImages : [],
                bookingPreference: data.bookingPreference || "open",
                travelFrequency: data.travelFrequency || "rare",
                shop: data.shop || "",
                shopName: data.shopName || data.shop || "",
                avatar: data.avatar,
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

    const handleImageUpload = async (file: File, type: "avatar" | "cover" | "portfolio") => {
        try {
            setUploading(true);
            const token = await getToken();
            
            const sigResponse = await fetch(
                type === "avatar" 
                    ? `${API_URL}/users/avatar/signature`
                    : `${API_URL}/images/sign?kind=artist_portfolio`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (!sigResponse.ok) throw new Error("Failed to get upload signature");
            const signature = await sigResponse.json();

            const uploadData = await uploadToCloudinary(file, signature);

            if (type === "avatar") {
                const updateResponse = await fetch(`${API_URL}/users/me/avatar`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        url: uploadData.secure_url || uploadData.url,
                        publicId: uploadData.public_id,
                        width: uploadData.width,
                        height: uploadData.height,
                    }),
                });
                if (!updateResponse.ok) throw new Error("Failed to update avatar");
                await loadProfile();
            } else if (type === "cover") {
                setEditedArtist({ ...editedArtist, coverImage: uploadData.secure_url || uploadData.url });
                setBgOk(true);
            } else if (type === "portfolio") {
                const currentPortfolio = editedArtist.portfolioImages || artist?.portfolioImages || [];
                setEditedArtist({ 
                    ...editedArtist, 
                    portfolioImages: [...currentPortfolio, uploadData.secure_url || uploadData.url]
                });
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePortfolioImage = (index: number) => {
        const currentPortfolio = editedArtist.portfolioImages || artist?.portfolioImages || [];
        const updated = currentPortfolio.filter((_, i) => i !== index);
        setEditedArtist({ ...editedArtist, portfolioImages: updated });
    };

    const handleAddStyle = () => {
        if (!newStyleInput.trim()) return;
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        if (!stylesArray.includes(newStyleInput.trim())) {
            setEditedArtist({ ...editedArtist, styles: [...stylesArray, newStyleInput.trim()] });
        }
        setNewStyleInput("");
    };

    const handleRemoveStyle = (style: string) => {
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        setEditedArtist({ ...editedArtist, styles: stylesArray.filter(s => s !== style) });
    };

    const saveProfile = async () => {
        if (!user || !artist) return;
        try {
            setSaving(true);
            const token = await getToken();
            const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
            const username = editedArtist.username || artist.username || user.firstName || email.split("@")[0] || "user";
            
            if (editedArtist.portfolioImages && JSON.stringify(editedArtist.portfolioImages) !== JSON.stringify(artist.portfolioImages)) {
                const portfolioResponse = await fetch(`${API_URL}/users/me/portfolio`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ urls: editedArtist.portfolioImages }),
                });
                if (!portfolioResponse.ok) {
                    console.error("Failed to update portfolio");
                }
            }

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
                        coverImage: editedArtist.coverImage ?? artist.coverImage,
                    },
                    bio: editedArtist.bio ?? artist.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");
            
            await loadProfile();
            setEditedArtist({});
            setEditing(false);
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Get current display values (either edited or original)
    const currentUsername = editing ? (editedArtist.username ?? artist?.username) : artist?.username;
    const currentBio = editing ? (editedArtist.bio ?? artist?.bio) : artist?.bio;
    const currentLocation = editing ? (editedArtist.location ?? artist?.location) : artist?.location;
    const currentShop = editing ? (editedArtist.shop ?? artist?.shop) : artist?.shop;
    const currentYearsExperience = editing ? (editedArtist.yearsExperience ?? artist?.yearsExperience) : artist?.yearsExperience;
    const currentBaseRate = editing ? (editedArtist.baseRate ?? artist?.baseRate) : artist?.baseRate;
    const currentStyles = editing ? (editedArtist.styles ?? artist?.styles) : artist?.styles;
    const currentPortfolio = editing ? (editedArtist.portfolioImages ?? artist?.portfolioImages) : artist?.portfolioImages;
    const currentProfileImage = editing ? (editedArtist.profileImage ?? artist?.profileImage) : artist?.profileImage;
    const currentCoverImage = editing ? (editedArtist.coverImage ?? artist?.coverImage) : artist?.coverImage;

    const portfolio = useMemo(() => (currentPortfolio || []).filter(Boolean), [currentPortfolio]);
    const healedWorks = artist?.healedWorks?.length ? artist.healedWorks : [];
    const sketches = artist?.sketches?.length ? artist.sketches : [];

    const initials = useMemo(() => (currentUsername || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [currentUsername]);

    const bioText = (currentBio || "").trim() || `Nice to meet you, I'm ${currentUsername || "this artist"}, let's talk about your next tattoo.`;

    const stylesClean = useMemo(() => {
        const raw = currentStyles ?? [];
        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
        return arr.map(s => String(s).trim()).filter(Boolean);
    }, [currentStyles]);

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

    const shopLabel = currentShop || "";
    const years = typeof currentYearsExperience === "number" && currentYearsExperience >= 0 ? `${currentYearsExperience} yr${currentYearsExperience === 1 ? "" : "s"} exp` : "";
    const loc = currentLocation?.trim() || "";

    // Update avatar/cover display states when edited
    useEffect(() => {
        if (currentProfileImage) setAvatarOk(true);
        if (currentCoverImage) setBgOk(true);
    }, [currentProfileImage, currentCoverImage]);

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
        <div className="h-full min-h-0 w-full overflow-hidden">
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "avatar")}
            />
            <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "cover")}
            />
            <input
                ref={portfolioInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => handleImageUpload(file, "portfolio"));
                }}
            />
            <div className="group w-full h-full flex flex-col overflow-hidden rounded-3xl bg-card/90 transition" data-artist-card="true">
                <div className="relative w-full flex-shrink-0">
                    <div className="relative w-full h-[10rem] sm:h-[9rem] md:h-[11rem] overflow-hidden" style={{ background: "var(--elevated)" }}>
                        {bgOk && currentCoverImage ? (
                            <img
                                src={currentCoverImage}
                                alt={`${currentUsername} background`}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => setBgOk(false)}
                            />
                        ) : (
                            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
                        )}
                        {editing && (
                            <Button
                                onClick={() => coverInputRef.current?.click()}
                                disabled={uploading}
                                size="sm"
                                className="absolute top-4 right-4 z-10"
                                variant="secondary"
                            >
                                <Camera className="h-4 w-4 mr-2" />
                                {currentCoverImage ? "Change Cover" : "Add Cover"}
                            </Button>
                        )}
                        <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "3rem", background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] sm:-translate-y-1/2 grid place-items-center gap-2">
                            <div className="relative rounded-full overflow-hidden h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 shadow-2xl ring-2 ring-[color:var(--card)]" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
                                {avatarOk && currentProfileImage ? (
                                    <img
                                        src={currentProfileImage}
                                        alt={`${currentUsername} profile`}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                        onError={() => setAvatarOk(false)}
                                    />
                                ) : (
                                    <span className="absolute inset-0 grid place-items-center text-xl sm:text-2xl font-semibold" style={{ color: "var(--fg)" }}>
                                        {initials}
                                    </span>
                                )}
                                {editing && (
                                    <button
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={uploading}
                                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                                    >
                                        <Camera className="h-6 w-6 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-4 sm:px-6 pt-1 pb-3 flex-1 min-h-0 flex flex-col gap-2 overflow-hidden items-center">
                    <div className="flex flex-col items-center text-center gap-2 w-full max-w-2xl">
                        <div className="flex items-center justify-center w-full">
                            <Button
                                onClick={() => {
                                    if (editing) {
                                        saveProfile();
                                    } else {
                                        setEditing(true);
                                        setEditedArtist({});
                                    }
                                }}
                                disabled={saving || uploading}
                                size="sm"
                                variant="ghost"
                            >
                                {editing ? (
                                    <>
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? "Saving..." : "Save"}
                                    </>
                                ) : (
                                    <>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit Profile
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex flex-col items-center w-full">
                            {editing ? (
                                <input
                                    type="text"
                                    value={currentUsername}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                                    className="font-extrabold tracking-tight text-xl md:text-2xl bg-transparent border-b-2 border-white/20 focus:outline-none focus:border-white/40 text-center"
                                    style={{ color: "var(--fg)" }}
                                    placeholder="Your name"
                                />
                            ) : (
                                <h2 className="font-extrabold tracking-tight text-xl md:text-2xl" style={{ color: "var(--fg)" }}>
                                    {currentUsername}
                                </h2>
                            )}
                        </div>

                        <div className="w-full">
                            {editing ? (
                                <textarea
                                    value={currentBio || ""}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, bio: e.target.value })}
                                    className="w-full bg-transparent border border-white/20 rounded-lg p-2 focus:outline-none focus:border-white/40 resize-none text-xs md:text-sm"
                                    rows={2}
                                    style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}
                                    placeholder="Tell clients about yourself..."
                                />
                            ) : (
                                <p className="text-xs md:text-sm leading-relaxed max-w-prose" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                                    {bioText}
                                </p>
                            )}
                        </div>

                        {/* Editable fields in edit mode */}
                        {editing && (
                            <div className="w-full flex flex-col gap-3 mt-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--fg)" }}>Location</label>
                                        <input
                                            type="text"
                                            value={currentLocation || ""}
                                            onChange={(e) => setEditedArtist({ ...editedArtist, location: e.target.value })}
                                            className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                                            style={{ color: "var(--fg)" }}
                                            placeholder="City, State"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--fg)" }}>Shop Name</label>
                                        <input
                                            type="text"
                                            value={currentShop || ""}
                                            onChange={(e) => setEditedArtist({ ...editedArtist, shop: e.target.value })}
                                            className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                                            style={{ color: "var(--fg)" }}
                                            placeholder="Shop name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--fg)" }}>Years Experience</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={currentYearsExperience || 0}
                                            onChange={(e) => setEditedArtist({ ...editedArtist, yearsExperience: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                                            style={{ color: "var(--fg)" }}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--fg)" }}>Base Rate ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={currentBaseRate || 0}
                                            onChange={(e) => setEditedArtist({ ...editedArtist, baseRate: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                                            style={{ color: "var(--fg)" }}
                                        />
                                    </div>
                                </div>

                                {/* Styles/Tags editor */}
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--fg)" }}>Styles/Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {stylesClean.map((style) => (
                                            <span
                                                key={style}
                                                className="rounded-full px-3 py-1 border flex items-center gap-1 text-sm"
                                                style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
                                            >
                                                {style}
                                                <button
                                                    onClick={() => handleRemoveStyle(style)}
                                                    className="hover:text-red-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newStyleInput}
                                            onChange={(e) => setNewStyleInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStyle())}
                                            className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
                                            style={{ color: "var(--fg)" }}
                                            placeholder="Add a style (e.g. Traditional, Realism)"
                                        />
                                        <Button onClick={handleAddStyle} size="sm" variant="secondary">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Display tags when not editing */}
                        {!editing && (
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
                                {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
                                {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
                                {shopLabel && chip(shopLabel, "shop")}
                                {years && chip(years, "years")}
                                {loc && chip(loc, "loc")}
                            </div>
                        )}

                        <div className="mt-3 w-full">
                            {editing && (
                                <div className="flex items-center justify-center mb-2">
                                    <Button
                                        onClick={() => portfolioInputRef.current?.click()}
                                        disabled={uploading}
                                        size="sm"
                                        variant="secondary"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Images
                                    </Button>
                                </div>
                            )}
                            {portfolio.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                                    {portfolio.map((src, i) => (
                                        <div
                                            key={`${src}-${i}`}
                                            className="relative aspect-square w-full overflow-hidden rounded-xl border group"
                                            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        >
                                            <img
                                                src={src}
                                                alt={`Work ${i + 1}`}
                                                className="h-full w-full object-cover"
                                                loading={i < 6 ? "eager" : "lazy"}
                                                decoding="async"
                                                referrerPolicy="no-referrer"
                                            />
                                            {editing && (
                                                <button
                                                    onClick={() => handleRemovePortfolioImage(i)}
                                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                editing && (
                                    <div
                                        className="w-full h-32 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                                        style={{ borderColor: "var(--border)" }}
                                        onClick={() => portfolioInputRef.current?.click()}
                                    >
                                        <div className="flex flex-col items-center gap-2" style={{ color: "var(--fg)" }}>
                                            <Upload className="h-6 w-6" />
                                            <span className="text-sm">Click to upload portfolio images</span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                        {healedWorks.length > 0 && (
                            <div className="mt-2 w-full">
                                <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>
                                    Healed Works
                                </h4>
                                <Grid images={healedWorks} />
                            </div>
                        )}

                        {sketches.length > 0 && (
                            <div className="mt-2 w-full">
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
