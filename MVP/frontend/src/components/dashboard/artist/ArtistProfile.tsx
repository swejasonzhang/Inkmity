import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Edit2, X, Plus, Camera, Briefcase, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [portfolioCategory, setPortfolioCategory] = useState<"pastWorks" | "recentWorks" | "sketches">("recentWorks");
    const [artist, setArtist] = useState<Artist | null>(null);
    const [editedArtist, setEditedArtist] = useState<Partial<Artist>>({});
    const [editedPastWorks, setEditedPastWorks] = useState<string[]>([]);
    const [editedRecentWorks, setEditedRecentWorks] = useState<string[]>([]);
    const [editedSketches, setEditedSketches] = useState<string[]>([]);
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
                pastWorks: Array.isArray(data.pastWorks) ? data.pastWorks : [],
                healedWorks: Array.isArray(data.healedWorks) ? data.healedWorks : [],
                sketches: Array.isArray(data.sketches) ? data.sketches : [],
                bookingPreference: data.bookingPreference || "open",
                travelFrequency: data.travelFrequency || "rare",
                shop: data.shop || "",
                shopName: data.shopName || data.shop || "",
                avatar: data.avatar,
            };
            setArtist(artistData);
            setEditedArtist(artistData);
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
                const imageUrl = uploadData.secure_url || uploadData.url;
                if (portfolioModalOpen) {
                    if (portfolioCategory === "pastWorks") {
                        setEditedPastWorks(prev => [...prev, imageUrl]);
                    } else if (portfolioCategory === "recentWorks") {
                        setEditedRecentWorks(prev => [...prev, imageUrl]);
                    } else if (portfolioCategory === "sketches") {
                        setEditedSketches(prev => [...prev, imageUrl]);
                    }
                } else {
                    const currentPortfolio = editedArtist.portfolioImages || artist?.portfolioImages || [];
                    setEditedArtist(prev => ({
                        ...prev,
                        portfolioImages: [...currentPortfolio, imageUrl]
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePortfolioImage = (index: number, category: "pastWorks" | "recentWorks" | "sketches") => {
        if (category === "pastWorks") {
            setEditedPastWorks(prev => prev.filter((_, i) => i !== index));
        } else if (category === "recentWorks") {
            setEditedRecentWorks(prev => prev.filter((_, i) => i !== index));
        } else if (category === "sketches") {
            setEditedSketches(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleMovePortfolioImage = (index: number, direction: "up" | "down", category: "pastWorks" | "recentWorks" | "sketches") => {
        let currentArray: string[] = [];
        let setter: (arr: string[]) => void;
        
        if (category === "pastWorks") {
            currentArray = editedPastWorks;
            setter = setEditedPastWorks;
        } else if (category === "recentWorks") {
            currentArray = editedRecentWorks;
            setter = setEditedRecentWorks;
        } else {
            currentArray = editedSketches;
            setter = setEditedSketches;
        }

        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === currentArray.length - 1) return;
        
        const newArray = [...currentArray];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newArray[index], newArray[targetIndex]] = [newArray[targetIndex], newArray[index]];
        setter(newArray);
    };

    const savePortfolio = async () => {
        if (!user || !artist) return;
        try {
            setSaving(true);
            const token = await getToken();

            const response = await fetch(`${API_URL}/users/sync`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clerkId: user.id,
                    email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "",
                    role: "artist",
                    username: artist.username,
                    profile: {
                        ...artist,
                        portfolioImages: editedRecentWorks,
                        pastWorks: editedPastWorks,
                        sketches: editedSketches,
                    },
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to update portfolio");
            }

            await loadProfile();
            setPortfolioModalOpen(false);
            setEditedPastWorks([]);
            setEditedRecentWorks([]);
            setEditedSketches([]);
        } catch (error) {
            console.error("Failed to save portfolio:", error);
            alert("Failed to save portfolio. Please try again.");
        } finally {
            setSaving(false);
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

    const currentUsername = editing ? (editedArtist.username ?? artist?.username) : artist?.username;
    const currentBio = editing ? (editedArtist.bio ?? artist?.bio) : artist?.bio;
    const currentLocation = editing ? (editedArtist.location ?? artist?.location) : artist?.location;
    const currentShop = editing ? (editedArtist.shop ?? artist?.shop) : artist?.shop;
    const currentYearsExperience = editing ? (editedArtist.yearsExperience ?? artist?.yearsExperience) : artist?.yearsExperience;
    const currentStyles = editing ? (editedArtist.styles ?? artist?.styles) : artist?.styles;
    const currentProfileImage = editing ? (editedArtist.profileImage ?? artist?.profileImage) : artist?.profileImage;
    const currentCoverImage = editing ? (editedArtist.coverImage ?? artist?.coverImage) : artist?.coverImage;

    const portfolioPreview = useMemo(() => {
        const recentWorks = artist?.portfolioImages || [];
        return recentWorks.filter(Boolean).slice(0, 3);
    }, [artist?.portfolioImages]);
    const pastWorks = artist?.pastWorks || [];
    const recentWorks = artist?.portfolioImages || [];
    const healedWorks = artist?.healedWorks || [];
    const sketches = artist?.sketches || [];

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
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
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
    const years = typeof currentYearsExperience === "number" && currentYearsExperience >= 0
        ? (currentYearsExperience === 0 ? "<1 yr exp" : `${currentYearsExperience} yr${currentYearsExperience === 1 ? "" : "s"} exp`)
        : "";
    const loc = currentLocation?.trim() || "";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>Loading profile...</div>
            </div>
        );
    }

    if (!artist) {
        return (
            <div className="flex items-center justify-center h-full">
                <div style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>No profile data available</div>
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 w-full overflow-y-auto flex items-start justify-center py-4 px-4">
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
            <div className="group w-full max-w-4xl h-full flex flex-col rounded-3xl transition relative overflow-hidden p-8 items-center justify-center" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 95%, var(--fg) 5%), color-mix(in oklab, var(--bg) 75%, var(--fg) 25%))" }}>
                <div className="flex flex-col items-center justify-center text-center gap-1 w-full max-w-2xl relative flex-1">
                    <div className="absolute top-0 right-0 z-20 flex gap-2">
                        {!editing ? (
                            <Button
                                onClick={() => {
                                    setEditing(true);
                                    setEditedArtist(artist);
                                }}
                                size="sm"
                                variant="outline"
                                className="backdrop-blur-sm bg-[color:var(--card)]/80 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                            >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Profile
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        setEditing(false);
                                        setEditedArtist({});
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="backdrop-blur-sm bg-[color:var(--card)]/80 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveProfile}
                                    disabled={saving || uploading}
                                    size="sm"
                                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                                    className="hover:opacity-90 font-semibold"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save"}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] transition-all duration-300 mb-4 h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
                        {currentCoverImage && (
                            <img
                                src={currentCoverImage}
                                alt="Background"
                                className="absolute inset-0 h-full w-full object-cover"
                                style={{ opacity: 0.4, filter: 'blur(3px)', zIndex: 1 }}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        )}
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

                    <div className="flex flex-col items-center w-full mt-2 min-h-[2.5rem]">
                        <h2 className="font-extrabold tracking-tight text-xl md:text-2xl" style={{ color: "var(--fg)" }}>
                            {currentUsername}
                        </h2>
                    </div>

                    <div className="w-full flex justify-center mt-2 min-h-[3rem]">
                        <p className="text-xs md:text-sm leading-relaxed max-w-prose text-center mx-auto" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                            {bioText}
                        </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm min-h-[2rem]">
                        {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
                        {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
                        {shopLabel && chip(shopLabel, "shop")}
                        {years && chip(years, "years")}
                        {loc && chip(loc, "loc")}
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

                            <div className="space-y-6 py-4 flex flex-col items-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative rounded-full overflow-hidden shadow-xl ring-2 ring-[color:var(--border)] h-32 w-32" style={{ background: "var(--card)" }}>
                                        {currentCoverImage && (
                                            <img
                                                key={currentCoverImage}
                                                src={currentCoverImage}
                                                alt="Background"
                                                className="absolute inset-0 h-full w-full object-cover"
                                                style={{ opacity: 0.4, filter: 'blur(3px)', zIndex: 1 }}
                                                loading="eager"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}
                                        {currentProfileImage ? (
                                            <img
                                                key={currentProfileImage}
                                                src={currentProfileImage}
                                                alt={`${currentUsername} profile`}
                                                className="absolute inset-0 h-full w-full object-cover"
                                                style={{ zIndex: 2 }}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <span className="absolute inset-0 grid place-items-center font-semibold text-2xl" style={{ color: "var(--fg)", zIndex: 2 }}>
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

                                    <Button
                                        onClick={() => coverInputRef.current?.click()}
                                        disabled={uploading}
                                        size="sm"
                                        variant="outline"
                                        className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                    >
                                        <Camera className="h-4 w-4 mr-2" />
                                        {uploading ? "Uploading..." : (currentCoverImage ? "Change Background" : "Add Background")}
                                    </Button>
                                </div>

                                <div className="space-y-2 w-full max-w-md">
                                    <Label htmlFor="modal-username" className="text-center block w-full" style={{ color: "var(--fg)" }}>Display Name</Label>
                                    <Input
                                        id="modal-username"
                                        type="text"
                                        value={editedArtist.username ?? artist?.username ?? ""}
                                        onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                                        className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                        placeholder="Your name"
                                    />
                                </div>

                                <div className="space-y-2 w-full max-w-md">
                                    <Label htmlFor="modal-bio" className="text-center block w-full" style={{ color: "var(--fg)" }}>Bio</Label>
                                    <textarea
                                        id="modal-bio"
                                        value={editedArtist.bio ?? artist?.bio ?? ""}
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
                                                value={editedArtist.location ?? artist?.location ?? ""}
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
                                                value={editedArtist.yearsExperience ?? artist?.yearsExperience ?? 0}
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
                                                value={editedArtist.baseRate ?? artist?.baseRate ?? 0}
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
                                        {(() => {
                                            const rawStyles = editedArtist.styles ?? artist?.styles ?? [];
                                            const stylesArray = Array.isArray(rawStyles) ? rawStyles : (typeof rawStyles === "string" ? rawStyles.split(/[;,/]+/) : []);
                                            const cleanStyles = stylesArray.map((s: string | number) => String(s).trim()).filter(Boolean);
                                            if (cleanStyles.length > 0) {
                                                return cleanStyles.map((styleStr: string) => (
                                                    <span
                                                        key={styleStr}
                                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all hover:scale-105"
                                                        style={{
                                                            borderColor: "var(--border)",
                                                            background: "linear-gradient(135deg, color-mix(in oklab, var(--elevated) 95%, var(--fg) 5%), color-mix(in oklab, var(--elevated) 85%, var(--fg) 15%))",
                                                            color: "var(--fg)"
                                                        }}
                                                    >
                                                        {styleStr}
                                                        <button
                                                            onClick={() => handleRemoveStyle(styleStr)}
                                                            className="hover:text-red-400 transition-colors hover:scale-110"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                ));
                                            }
                                            return (
                                                <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                                    No styles added yet
                                                </span>
                                            );
                                        })()}
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

                            <div className="flex gap-3 justify-center pt-4 border-t w-full" style={{ borderColor: "var(--border)" }}>
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

                    <div className="mt-6 w-full">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                                Recent Works {recentWorks.length > 0 && `(${recentWorks.length})`}
                            </h4>
                            <Button
                                onClick={() => {
                                    setEditedPastWorks([...pastWorks]);
                                    setEditedRecentWorks([...recentWorks]);
                                    setEditedSketches([...sketches]);
                                    setPortfolioCategory("recentWorks");
                                    setPortfolioModalOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                            >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Manage Portfolio
                            </Button>
                        </div>
                        {portfolioPreview.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                                {portfolioPreview.map((src, i) => (
                                    <div
                                        key={`${src}-${i}`}
                                        className="relative aspect-square w-full overflow-hidden rounded-xl border"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                    >
                                        <img
                                            src={src}
                                            alt={`Work ${i + 1}`}
                                            className="h-full w-full object-cover"
                                            loading={i < 3 ? "eager" : "lazy"}
                                            decoding="async"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <Dialog open={portfolioModalOpen} onOpenChange={(open) => {
                        if (!open) {
                            setPortfolioModalOpen(false);
                            setEditedPastWorks([]);
                            setEditedRecentWorks([]);
                            setEditedSketches([]);
                        }
                    }}>
                        <DialogContent
                            className="max-w-5xl max-h-[90vh] overflow-y-auto z-[9999]"
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
                                    Manage Portfolio
                                </DialogTitle>
                            </DialogHeader>

                            <Tabs value={portfolioCategory} onValueChange={(value) => setPortfolioCategory(value as "pastWorks" | "recentWorks" | "sketches")} className="w-full">
                                <TabsList className="w-full justify-start mb-6" style={{ background: "color-mix(in oklab, var(--elevated) 50%, transparent)", borderColor: "var(--border)" }}>
                                    <TabsTrigger value="recentWorks" style={{ color: "var(--fg)" }}>Recent Works</TabsTrigger>
                                    <TabsTrigger value="pastWorks" style={{ color: "var(--fg)" }}>Past Works</TabsTrigger>
                                    <TabsTrigger value="sketches" style={{ color: "var(--fg)" }}>Upcoming Sketches</TabsTrigger>
                                </TabsList>

                                <TabsContent value="recentWorks" className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            First 3 images will appear in your profile preview. Use arrows to reorder.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setPortfolioCategory("recentWorks");
                                                portfolioInputRef.current?.click();
                                            }}
                                            disabled={uploading}
                                            size="sm"
                                            variant="outline"
                                            className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {uploading ? "Uploading..." : "Add Images"}
                                        </Button>
                                    </div>
                                    {editedRecentWorks.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-3 w-full">
                                            {editedRecentWorks.map((src, i) => (
                                                <div
                                                    key={`recent-${src}-${i}`}
                                                    className="relative aspect-square w-full overflow-hidden rounded-xl border group"
                                                    style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                                >
                                                    {i < 3 && (
                                                        <div className="absolute top-2 left-2 z-10 bg-yellow-500/90 text-black text-xs font-bold px-2 py-0.5 rounded">
                                                            Preview {i + 1}
                                                        </div>
                                                    )}
                                                    <img
                                                        src={src}
                                                        alt={`Recent Work ${i + 1}`}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                                                        {i > 0 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "up", "recentWorks")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move up"
                                                            >
                                                                <ArrowUp className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        {i < editedRecentWorks.length - 1 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "down", "recentWorks")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move down"
                                                            >
                                                                <ArrowDown className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemovePortfolioImage(i, "recentWorks")}
                                                            className="bg-red-500/80 hover:bg-red-500 rounded-full p-2 transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-white" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-center py-12 border-2 border-dashed rounded-xl" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                            No recent works. Click "Add Images" to get started.
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="pastWorks" className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            Showcase your completed past works. Use arrows to reorder.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setPortfolioCategory("pastWorks");
                                                portfolioInputRef.current?.click();
                                            }}
                                            disabled={uploading}
                                            size="sm"
                                            variant="outline"
                                            className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {uploading ? "Uploading..." : "Add Images"}
                                        </Button>
                                    </div>
                                    {editedPastWorks.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-3 w-full">
                                            {editedPastWorks.map((src, i) => (
                                                <div
                                                    key={`past-${src}-${i}`}
                                                    className="relative aspect-square w-full overflow-hidden rounded-xl border group"
                                                    style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`Past Work ${i + 1}`}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                                                        {i > 0 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "up", "pastWorks")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move up"
                                                            >
                                                                <ArrowUp className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        {i < editedPastWorks.length - 1 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "down", "pastWorks")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move down"
                                                            >
                                                                <ArrowDown className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemovePortfolioImage(i, "pastWorks")}
                                                            className="bg-red-500/80 hover:bg-red-500 rounded-full p-2 transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-white" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-center py-12 border-2 border-dashed rounded-xl" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                            No past works. Click "Add Images" to get started.
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="sketches" className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            Share your upcoming sketches and designs. Use arrows to reorder.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setPortfolioCategory("sketches");
                                                portfolioInputRef.current?.click();
                                            }}
                                            disabled={uploading}
                                            size="sm"
                                            variant="outline"
                                            className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {uploading ? "Uploading..." : "Add Images"}
                                        </Button>
                                    </div>
                                    {editedSketches.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-3 w-full">
                                            {editedSketches.map((src, i) => (
                                                <div
                                                    key={`sketch-${src}-${i}`}
                                                    className="relative aspect-square w-full overflow-hidden rounded-xl border group"
                                                    style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`Sketch ${i + 1}`}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                                                        {i > 0 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "up", "sketches")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move up"
                                                            >
                                                                <ArrowUp className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        {i < editedSketches.length - 1 && (
                                                            <button
                                                                onClick={() => handleMovePortfolioImage(i, "down", "sketches")}
                                                                className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                                                title="Move down"
                                                            >
                                                                <ArrowDown className="h-4 w-4 text-white" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemovePortfolioImage(i, "sketches")}
                                                            className="bg-red-500/80 hover:bg-red-500 rounded-full p-2 transition-colors"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-white" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-center py-12 border-2 border-dashed rounded-xl" style={{ borderColor: "var(--border)", color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                            No sketches. Click "Add Images" to get started.
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <div className="flex gap-3 justify-center pt-4 border-t w-full" style={{ borderColor: "var(--border)" }}>
                                <Button
                                    onClick={() => {
                                        setPortfolioModalOpen(false);
                                        setEditedPastWorks([]);
                                        setEditedRecentWorks([]);
                                        setEditedSketches([]);
                                    }}
                                    disabled={saving || uploading}
                                    variant="outline"
                                    className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={savePortfolio}
                                    disabled={saving || uploading}
                                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                                    className="hover:opacity-90 font-semibold"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save Portfolio"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {healedWorks.length > 0 && (
                        <div className="mt-6 w-full">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>
                                Healed Works
                            </h4>
                            <Grid images={healedWorks} />
                        </div>
                    )}

                    {sketches.length > 0 && (
                        <div className="mt-6 w-full">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>
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
