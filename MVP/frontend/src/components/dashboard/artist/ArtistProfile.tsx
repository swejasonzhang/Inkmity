import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Edit2, X, Plus, Camera, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
                const newCoverUrl = uploadData.secure_url || uploadData.url;
                setEditedArtist(prev => ({ ...prev, coverImage: newCoverUrl }));
            } else if (type === "portfolio") {
                const currentPortfolio = editedArtist.portfolioImages || artist?.portfolioImages || [];
                setEditedArtist(prev => ({
                    ...prev,
                    portfolioImages: [...currentPortfolio, uploadData.secure_url || uploadData.url]
                }));
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
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

    const currentUsername = artist?.username;
    const currentBio = artist?.bio;
    const currentLocation = artist?.location;
    const currentShop = artist?.shop;
    const currentYearsExperience = artist?.yearsExperience;
    const currentStyles = artist?.styles;
    const currentPortfolio = artist?.portfolioImages;
    const currentProfileImage = artist?.profileImage;
    const currentCoverImage = artist?.coverImage;

    const modalUsername = editedArtist.username ?? artist?.username;
    const modalBio = editedArtist.bio ?? artist?.bio;
    const modalLocation = editedArtist.location ?? artist?.location;
    const modalYearsExperience = editedArtist.yearsExperience ?? artist?.yearsExperience;
    const modalBaseRate = editedArtist.baseRate ?? artist?.baseRate;
    const modalStyles = editedArtist.styles ?? artist?.styles;
    const modalProfileImage = editedArtist.profileImage ?? artist?.profileImage;
    const modalCoverImage = editedArtist.coverImage ?? artist?.coverImage;

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

    const modalStylesClean = useMemo(() => {
        const raw = modalStyles ?? [];
        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
        return arr.map(s => String(s).trim()).filter(Boolean);
    }, [modalStyles]);

    const stylesPrimary = stylesClean.slice(0, 3);
    const stylesOverflow = Math.max(0, stylesClean.length - stylesPrimary.length);

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
    const years = typeof currentYearsExperience === "number" && currentYearsExperience >= 0
        ? (currentYearsExperience === 0 ? "<1 yr exp" : `${currentYearsExperience} yr${currentYearsExperience === 1 ? "" : "s"} exp`)
        : "";
    const loc = currentLocation?.trim() || "";


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
        <div className="h-full min-h-0 w-full overflow-hidden flex items-center justify-center py-4 px-4">
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
            <div className="group w-full max-w-4xl h-full flex flex-col rounded-3xl transition relative overflow-hidden" data-artist-card="true" style={{ background: "var(--bg)" }}>
                <div className="relative w-full h-64 flex items-center justify-center overflow-hidden rounded-t-3xl" style={{ background: "var(--bg)" }}>
                    {currentCoverImage && (
                        <div className="absolute inset-0 z-0">
                            <img
                                src={currentCoverImage}
                                alt="Profile banner"
                                className="h-full w-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                        <Button
                            onClick={() => {
                                setEditing(true);
                                setEditedArtist({});
                            }}
                            size="sm"
                            variant="outline"
                            className="backdrop-blur-sm bg-[color:var(--card)]/80 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                    <div className="relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] transition-all duration-300 h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40 z-10" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
                        {currentProfileImage ? (
                            <img
                                src={currentProfileImage}
                                alt={`${currentUsername} profile`}
                                className="absolute inset-0 h-full w-full object-cover"
                                style={{ zIndex: 2 }}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <span className="absolute inset-0 grid place-items-center font-semibold text-2xl sm:text-3xl md:text-4xl" style={{ color: "var(--fg)", zIndex: 2 }}>
                                {initials}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 w-full relative px-8 py-12 rounded-b-3xl" style={{ background: "linear-gradient(to bottom, var(--bg), color-mix(in oklab, var(--bg) 85%, var(--fg) 15%))" }}>
                    <div className="flex flex-col items-center justify-center w-full">
                        <h2 className="font-extrabold tracking-tight text-xl md:text-2xl" style={{ color: "var(--fg)" }}>
                            {currentUsername}
                        </h2>
                    </div>

                    <div className="w-full flex justify-center px-4">
                        <p className="text-sm md:text-base leading-relaxed max-w-prose text-center mx-auto" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                            {bioText}
                        </p>
                    </div>

                    <Dialog open={editing} onOpenChange={(open) => {
                        if (!open) {
                            setEditing(false);
                            setEditedArtist({});
                        }
                    }}>
                        <DialogContent
                            className="max-w-3xl max-h-[90vh] overflow-y-auto z-[9999]"
                            style={{
                                background: "var(--card)",
                                borderColor: "var(--border)",
                                color: "var(--fg)"
                            }}
                            showCloseButton={true}
                        >
                            <DialogHeader className="space-y-4 text-center">
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2 justify-center" style={{ color: "var(--fg)" }}>
                                    <Edit2 className="h-6 w-6" style={{ color: "var(--fg)" }} />
                                    Edit Profile
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6 flex flex-col">
                                <div className="relative w-full max-w-md mx-auto h-40 flex items-center justify-center overflow-hidden rounded-lg px-4">
                                    {modalCoverImage && (
                                        <div className="absolute inset-0 z-0">
                                            <img
                                                key={modalCoverImage}
                                                src={modalCoverImage}
                                                alt="Profile banner"
                                                className="h-full w-full object-cover object-center"
                                                loading="eager"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                    )}
                                    <div className="relative rounded-full overflow-hidden shadow-xl ring-2 ring-[color:var(--border)] h-28 w-28 z-10" style={{ background: "var(--card)" }}>
                                        {modalProfileImage ? (
                                            <img
                                                key={modalProfileImage}
                                                src={modalProfileImage}
                                                alt={`${modalUsername} profile`}
                                                className="absolute inset-0 h-full w-full object-cover"
                                                style={{ zIndex: 2 }}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span className="absolute inset-0 grid place-items-center font-semibold text-xl" style={{ color: "var(--fg)", zIndex: 2 }}>
                                                {initials}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={uploading}
                                            className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1 group"
                                            style={{ zIndex: 20 }}
                                        >
                                            <Camera className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                                            <span className="text-xs text-white/80">Change</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-center">
                                    <Button
                                        onClick={() => coverInputRef.current?.click()}
                                        disabled={uploading}
                                        size="default"
                                        variant="outline"
                                        className="border-2 border-[color:var(--border)] hover:bg-[color:var(--elevated)] bg-[color:var(--card)] font-semibold shadow-md px-4 py-2"
                                        style={{ color: "var(--fg)" }}
                                    >
                                        <Camera className="h-4 w-4 mr-2" />
                                        {uploading ? "Uploading..." : (modalCoverImage ? "Change Banner" : "Add Banner")}
                                    </Button>
                                </div>

                            <div className="space-y-6 py-4 flex flex-col items-center px-6">

                                <div className="space-y-2 w-full max-w-md">
                                    <Label htmlFor="modal-username" className="text-center block w-full" style={{ color: "var(--fg)" }}>Display Name</Label>
                                    <Input
                                        id="modal-username"
                                        type="text"
                                        value={modalUsername}
                                        onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                                        className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                        placeholder="Your name"
                                    />
                                </div>

                                <div className="space-y-2 w-full max-w-md">
                                    <Label htmlFor="modal-bio" className="text-center block w-full" style={{ color: "var(--fg)" }}>Bio</Label>
                                    <textarea
                                        id="modal-bio"
                                        value={modalBio || ""}
                                        onChange={(e) => setEditedArtist({ ...editedArtist, bio: e.target.value })}
                                        className="w-full bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-sm transition-all text-center"
                                        rows={3}
                                        style={{ color: "var(--fg)" }}
                                        placeholder="Tell clients about yourself..."
                                    />
                                </div>

                                <div className="rounded-2xl p-6 border backdrop-blur-sm w-full max-w-2xl"
                                    style={{
                                        background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                        borderColor: "var(--border)"
                                    }}>
                                    <h3 className="text-sm font-semibold mb-5 flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                        <Briefcase className="h-4 w-4" style={{ color: "var(--fg)" }} />
                                        Professional Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="location" className="text-xs flex items-center justify-center gap-2 w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                Location
                                            </Label>
                                            <Input
                                                id="location"
                                                type="text"
                                                value={modalLocation || ""}
                                                onChange={(e) => setEditedArtist({ ...editedArtist, location: e.target.value })}
                                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                                placeholder="City, State"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="years" className="text-xs flex items-center justify-center gap-2 w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                Years Experience
                                            </Label>
                                            <Input
                                                id="years"
                                                type="number"
                                                min="0"
                                                value={modalYearsExperience || 0}
                                                onChange={(e) => setEditedArtist({ ...editedArtist, yearsExperience: parseInt(e.target.value) || 0 })}
                                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="rate" className="text-xs flex items-center justify-center gap-2 w-full whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                Base Rate (USD/hr)
                                            </Label>
                                            <Input
                                                id="rate"
                                                type="number"
                                                min="0"
                                                value={modalBaseRate || 0}
                                                onChange={(e) => setEditedArtist({ ...editedArtist, baseRate: parseInt(e.target.value) || 0 })}
                                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl p-6 border backdrop-blur-sm w-full max-w-2xl"
                                    style={{
                                        background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                        borderColor: "var(--border)"
                                    }}>
                                    <Label className="text-sm font-semibold mb-4 flex items-center justify-center gap-2 w-full" style={{ color: "var(--fg)" }}>
                                        Specialty Styles
                                    </Label>
                                    <div className="flex flex-wrap gap-2 mb-4 min-h-[42px] p-3 rounded-lg border justify-center"
                                        style={{
                                            background: "color-mix(in oklab, var(--elevated) 40%, transparent)",
                                            borderColor: "var(--border)"
                                        }}>
                                        {modalStylesClean.length > 0 ? modalStylesClean.map((style) => (
                                            <span
                                                key={style}
                                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all hover:scale-105"
                                                style={{
                                                    borderColor: "var(--border)",
                                                    background: "linear-gradient(135deg, color-mix(in oklab, var(--elevated) 95%, var(--fg) 5%), color-mix(in oklab, var(--elevated) 85%, var(--fg) 15%))",
                                                    color: "var(--fg)"
                                                }}
                                            >
                                                {style}
                                                <button
                                                    onClick={() => handleRemoveStyle(style)}
                                                    className="hover:text-red-400 transition-colors hover:scale-110"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </span>
                                        )) : (
                                            <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                                No styles added yet
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Input
                                            type="text"
                                            value={newStyleInput}
                                            onChange={(e) => setNewStyleInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddStyle();
                                                }
                                            }}
                                            className="flex-1 bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                            placeholder="Add a style (e.g. Traditional, Realism)"
                                        />
                                        <Button
                                            onClick={handleAddStyle}
                                            size="sm"
                                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                                            className="hover:opacity-90 font-semibold"
                                        >
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            </div>

                            <div className="flex gap-3 justify-center pt-4 border-t w-full px-6" style={{ borderColor: "var(--border)" }}>
                                <Button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditedArtist({});
                                    }}
                                    disabled={saving || uploading}
                                    variant="outline"
                                    className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveProfile}
                                    disabled={saving || uploading}
                                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                                    className="hover:opacity-90 font-semibold"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {!editing && (
                        <div className="flex flex-wrap items-center justify-center gap-2 px-4">
                            {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
                            {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
                            {shopLabel && chip(shopLabel, "shop")}
                            {years && chip(years, "years")}
                            {loc && chip(loc, "loc")}
                        </div>
                    )}

                    {portfolio.length > 0 && (
                        <div className="w-full flex justify-center px-4 py-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
                                {portfolio.map((src, i) => (
                                    <div
                                        key={`${src}-${i}`}
                                        className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 group shadow-lg transition-transform hover:scale-[1.02]"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                    >
                                        <img
                                            src={src}
                                            alt={`Work ${i + 1}`}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                            loading={i < 6 ? "eager" : "lazy"}
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {healedWorks.length > 0 && (
                        <div className="w-full flex flex-col items-center px-4 py-6">
                            <h4 className="text-lg md:text-xl font-bold mb-6" style={{ color: "var(--fg)" }}>
                                Healed Works
                            </h4>
                            <div className="w-full max-w-4xl">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
                                    {healedWorks.map((src, i) => (
                                        <div
                                            key={`${src}-${i}`}
                                            className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-transform hover:scale-[1.02]"
                                            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        >
                                            <img
                                                src={src}
                                                alt={`Healed work ${i + 1}`}
                                                className="h-full w-full object-cover"
                                                loading={i < 6 ? "eager" : "lazy"}
                                                decoding="async"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {sketches.length > 0 && (
                        <div className="w-full flex flex-col items-center px-4 py-6">
                            <h4 className="text-lg md:text-xl font-bold mb-6" style={{ color: "var(--fg)" }}>
                                Sketches
                            </h4>
                            <div className="w-full max-w-4xl">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full">
                                    {sketches.map((src, i) => (
                                        <div
                                            key={`${src}-${i}`}
                                            className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 shadow-lg transition-transform hover:scale-[1.02]"
                                            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        >
                                            <img
                                                src={src}
                                                alt={`Sketch ${i + 1}`}
                                                className="h-full w-full object-cover"
                                                loading={i < 6 ? "eager" : "lazy"}
                                                decoding="async"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
