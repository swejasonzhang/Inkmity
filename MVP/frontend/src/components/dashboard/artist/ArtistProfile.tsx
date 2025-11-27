import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, X, Plus, Camera, Briefcase, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getBookingsForArtist, type Booking } from "@/api";
import clsx from "clsx";

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
    wontTattoo?: string[];
    avatar?: { url?: string; publicId?: string };
}

const YEARS_EXPERIENCE_OPTIONS = [
    { value: "0", label: "<1 year" },
    { value: "1", label: "1 year" },
    { value: "2", label: "2 years" },
    { value: "3", label: "3 years" },
    { value: "4", label: "4 years" },
    { value: "5", label: "5 years" },
    { value: "6", label: "6 years" },
    { value: "7", label: "7 years" },
    { value: "8", label: "8 years" },
    { value: "9", label: "9 years" },
    { value: "10", label: "10+ years" },
];

const BASE_RATE_OPTIONS = [
    { value: "50", label: "$50/hr" },
    { value: "75", label: "$75/hr" },
    { value: "100", label: "$100/hr" },
    { value: "125", label: "$125/hr" },
    { value: "150", label: "$150/hr" },
    { value: "175", label: "$175/hr" },
    { value: "200", label: "$200/hr" },
    { value: "250", label: "$250/hr" },
    { value: "300", label: "$300/hr" },
    { value: "350", label: "$350/hr" },
    { value: "400", label: "$400/hr" },
    { value: "500", label: "$500+/hr" },
];

const STYLE_OPTIONS = [
    "American Traditional",
    "Neo-traditional",
    "Japanese (Irezumi)",
    "Blackwork",
    "Black & Grey",
    "Fine line",
    "Single Needle",
    "Realism",
    "Micro Realism",
    "Surrealism",
    "Illustrative",
    "Watercolor",
    "Minimalist",
    "Geometric",
    "Linework",
    "Dotwork",
    "Ornamental",
    "Tribal",
    "Polynesian",
    "Maori",
    "Samoan",
    "Celtic",
    "Chicano",
    "Script/Lettering",
    "Calligraphy",
    "Trash Polka",
    "Biomechanical",
    "Bio-organic",
    "New School",
    "Old School",
    "Ignorant Style",
    "Abstract",
    "Sketch/Etching",
    "Etching/Woodcut",
    "Anime/Manga",
    "Korean Fine Line",
    "Botanical",
    "Floral",
    "Portrait",
    "Color Realism",
    "Neo-Japanese",
    "Whip Shading",
    "Hand-Poke",
    "UV/Blacklight",
];

export default function ArtistProfile() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [customYears, setCustomYears] = useState<string>("");
    const [customRate, setCustomRate] = useState<string>("");
    const [customLocation, setCustomLocation] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [artist, setArtist] = useState<Artist | null>(null);
    const [editedArtist, setEditedArtist] = useState<Partial<Artist>>({});
    const [uploading, setUploading] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<string>("");
    const [selectedWontTattoo, setSelectedWontTattoo] = useState<string>("");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const portfolioInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const startTime = Date.now();
        const minLoadTime = 1500;
        
        const load = async () => {
            try {
                await loadProfile();
            } finally {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, minLoadTime - elapsed);
                setTimeout(() => {
                    setLoading(false);
                }, remaining);
            }
        };
        
        load();
    }, []);

    useEffect(() => {
        const loadBookings = async () => {
            if (!user) return;
            try {
                setLoadingBookings(true);
                const token = await getToken();
                const artistBookings = await getBookingsForArtist(undefined, token);
                setBookings(artistBookings);
            } catch (error) {
                console.error("Failed to load bookings:", error);
            } finally {
                setLoadingBookings(false);
            }
        };
        loadBookings();
    }, [user, getToken]);

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
                shopName: data.shopName || "",
                wontTattoo: data.wontTattoo || [],
                avatar: data.avatar,
            };
            setArtist(artistData);
        } catch (error) {
            console.error("Failed to load profile:", error);
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
        if (!selectedStyle) return;
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        if (!stylesArray.includes(selectedStyle)) {
            setEditedArtist({ ...editedArtist, styles: [...stylesArray, selectedStyle] });
        }
        setSelectedStyle("");
    };

    const handleRemoveStyle = (style: string) => {
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        setEditedArtist({ ...editedArtist, styles: stylesArray.filter(s => s !== style) });
    };

    const handleAddWontTattoo = () => {
        if (!selectedWontTattoo) return;
        const currentWontTattoo = editedArtist.wontTattoo || artist?.wontTattoo || [];
        const wontTattooArray = Array.isArray(currentWontTattoo) ? currentWontTattoo : [];
        if (!wontTattooArray.includes(selectedWontTattoo)) {
            setEditedArtist({ ...editedArtist, wontTattoo: [...wontTattooArray, selectedWontTattoo] });
        }
        setSelectedWontTattoo("");
    };

    const handleRemoveWontTattoo = (item: string) => {
        const currentWontTattoo = editedArtist.wontTattoo || artist?.wontTattoo || [];
        const wontTattooArray = Array.isArray(currentWontTattoo) ? currentWontTattoo : [];
        setEditedArtist({ ...editedArtist, wontTattoo: wontTattooArray.filter(i => i !== item) });
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
                        coverImage: editedArtist.coverImage ?? artist.coverImage,
                        wontTattoo: editedArtist.wontTattoo ?? artist.wontTattoo,
                    },
                    bio: editedArtist.bio ?? artist.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");

            await loadProfile();
            setEditedArtist({});
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const username = editedArtist.username ?? artist?.username ?? "";
    const bio = editedArtist.bio ?? artist?.bio ?? "";
    const location = editedArtist.location ?? artist?.location ?? "";
    const yearsExperience = editedArtist.yearsExperience ?? artist?.yearsExperience ?? 0;
    const baseRate = editedArtist.baseRate ?? artist?.baseRate ?? 0;
    const styles = editedArtist.styles ?? artist?.styles ?? [];
    const wontTattoo = editedArtist.wontTattoo ?? artist?.wontTattoo ?? [];
    const portfolioImages = editedArtist.portfolioImages ?? artist?.portfolioImages ?? [];
    const profileImage = artist?.profileImage || artist?.avatar?.url || "";
    const coverImage = editedArtist.coverImage ?? artist?.coverImage ?? "";

    const yearsValue = yearsExperience === 0 ? "0" : yearsExperience > 10 ? "10" : String(yearsExperience);
    const rateValue = baseRate === 0 ? "" : (BASE_RATE_OPTIONS.find(opt => parseInt(opt.value) === baseRate) ? String(baseRate) : "");

    const hasChanges = Object.keys(editedArtist).length > 0;

    const portfolio = useMemo(() => (portfolioImages || []).filter(Boolean), [portfolioImages]);
    const healedWorks = artist?.healedWorks?.length ? artist.healedWorks : [];
    const sketches = artist?.sketches?.length ? artist.sketches : [];

    const initials = useMemo(() => (username || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [username]);

    const stylesClean = useMemo(() => {
        const raw = styles ?? [];
        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
        return arr.map(s => String(s).trim()).filter(Boolean);
    }, [styles]);

    const wontTattooClean = useMemo(() => {
        const raw = wontTattoo ?? [];
        if (Array.isArray(raw)) {
            return raw.map((s: string) => String(s).trim()).filter(Boolean);
        }
        return [];
    }, [wontTattoo]);

    const triggerBase = "h-10 sm:h-14 bg-elevated border-app text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0";
    const contentBase = "bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in";
    const itemCentered = "justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0";


    const LoadingComponent = () => {
        const fg = "var(--fg)";
        return (
            <div className="absolute inset-0 flex items-center justify-center">
                <style>{`
                    @keyframes ink-fill { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
                    @keyframes ink-pulse { 0%,100% { opacity:.4;} 50% {opacity:1;} }
                `}</style>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-56 h-2 rounded overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
                        <div className="h-full origin-left" style={{ background: fg, transform: "scaleX(0)", animation: "ink-fill 400ms linear forwards" }} />
                    </div>
                    <div className="text-xs tracking-widest uppercase" style={{ letterSpacing: "0.2em", opacity: 0.8, animation: "ink-pulse 1.2s ease-in-out infinite", color: fg }}>
                        Loading Profile
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="relative w-full" style={{ minHeight: "calc(100vh - 200px)" }}>
                <LoadingComponent />
            </div>
        );
    }


    return (
        <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8 overflow-y-visible">
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

            <div className="w-full md:w-[48%] flex-shrink-0 rounded-xl p-4 md:p-6">
                <div className="space-y-6 md:space-y-6">
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center" style={{ color: "var(--fg)" }}>Profile Settings</h1>
                    {hasChanges && (
                        <Button
                            onClick={saveProfile}
                            disabled={saving || uploading}
                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                            className="hover:opacity-90 w-full sm:w-auto sm:absolute sm:right-0"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6">
                        <div className="flex flex-col items-center">
                            <div className="relative w-full max-w-md h-32 sm:h-40 mb-[5px]">
                                {coverImage ? (
                                    <div className="relative w-full h-full rounded-lg overflow-hidden border border-[color:var(--border)]">
                                        <img
                                            src={coverImage}
                                            alt="Cover"
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                        <button
                                            onClick={() => coverInputRef.current?.click()}
                                            disabled={uploading}
                                            className="absolute top-2 right-2 p-2 rounded-full border-2 border-[color:var(--border)] bg-[color:var(--card)]/90 hover:bg-[color:var(--elevated)] transition-colors backdrop-blur-sm z-10"
                                            style={{ color: "var(--fg)" }}
                                            title="Change cover image"
                                        >
                                            <Camera className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-dashed" style={{ borderColor: "var(--border)" }}>
                                        <button
                                            onClick={() => coverInputRef.current?.click()}
                                            disabled={uploading}
                                            className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-[color:var(--elevated)] transition-colors disabled:opacity-50"
                                            style={{ color: "var(--fg)" }}
                                        >
                                            <Camera className="h-6 w-6" />
                                            <span className="text-sm">Add Cover Image</span>
                                        </button>
                                    </div>
                                )}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <div className="relative">
                                        <div className="relative rounded-full overflow-hidden w-24 h-24 sm:w-32 sm:h-32 ring-2 ring-[color:var(--card)] border-2 border-[color:var(--border)]" style={{ background: "var(--card)" }}>
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-semibold" style={{ color: "var(--fg)" }}>
                                                    {initials}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={uploading}
                                            className="absolute bottom-0 right-0 p-2 rounded-full border-2 border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--elevated)] transition-colors z-10"
                                            style={{ color: "var(--fg)" }}
                                            title="Change profile picture"
                                        >
                                            <Camera className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full max-w-md">
                                <Label htmlFor="username" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                    Display Name
                                </Label>
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                                    className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center"
                                    placeholder="Your name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <Briefcase className="h-5 w-5" />
                            Personal Information
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="bio" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                    Bio
                                </Label>
                                <textarea
                                    id="bio"
                                    value={bio}
                                    onChange={(e) => setEditedArtist({ ...editedArtist, bio: e.target.value })}
                                    className="w-full max-w-md mx-auto block bg-[color:var(--elevated)] border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-center"
                                    rows={4}
                                    style={{ color: "var(--fg)" }}
                                    placeholder="Tell clients about yourself..."
                                />
                            </div>
                            <div className="flex flex-col items-center">
                                <Label htmlFor="location" className="text-sm font-medium mb-2 text-center flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                    Location
                                </Label>
                                {(() => {
                                    const locationOptions = ["New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL", "San Francisco, CA", "Columbus, OH", "Seattle, WA", "Denver, CO", "Boston, MA"];
                                    const isCustom = location && !locationOptions.includes(location);
                                    return (
                                        <>
                                            <Select
                                                value={isCustom ? "custom" : (location || "")}
                                                onValueChange={(value) => {
                                                    if (value === "custom") {
                                                        setCustomLocation(location || "");
                                                    } else {
                                                        setEditedArtist({ ...editedArtist, location: value });
                                                        setCustomLocation("");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className={clsx(triggerBase, "w-full sm:w-[260px]")}>
                                                    <SelectValue placeholder="Select or enter location" />
                                                </SelectTrigger>
                                                <SelectContent className={contentBase} position="popper" align="start">
                                                    <SelectItem value="custom" className={itemCentered}>
                                                        Custom (enter below)
                                                    </SelectItem>
                                                    {locationOptions.map((loc) => (
                                                        <SelectItem key={loc} value={loc} className={itemCentered}>
                                                            {loc}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {isCustom || customLocation !== "" ? (
                                                <Input
                                                    type="text"
                                                    value={customLocation || location}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomLocation(val);
                                                        setEditedArtist({ ...editedArtist, location: val });
                                                    }}
                                                    className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center w-full sm:w-[260px] mt-2"
                                                    placeholder="Enter custom location"
                                                />
                                            ) : null}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <Briefcase className="h-5 w-5" />
                            Professional Information
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <div className="flex flex-col items-center">
                                    <Label htmlFor="years" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                        Years Experience
                                    </Label>
                                    <Select
                                        value={yearsValue}
                                        onValueChange={(value) => {
                                            if (value === "custom") {
                                                setCustomYears(yearsExperience > 10 ? String(yearsExperience) : "");
                                            } else {
                                                setEditedArtist({ ...editedArtist, yearsExperience: parseInt(value) || 0 });
                                                setCustomYears("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={clsx(triggerBase, "w-full")}>
                                            <SelectValue placeholder="Select years" />
                                        </SelectTrigger>
                                        <SelectContent className={contentBase} position="popper" align="start">
                                            {YEARS_EXPERIENCE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom" className={itemCentered}>
                                                Custom (enter below)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {customYears !== "" || (yearsExperience > 10 && !YEARS_EXPERIENCE_OPTIONS.find(opt => opt.value === String(yearsExperience))) ? (
                                        <Input
                                            type="number"
                                            min="0"
                                            value={customYears || (yearsExperience > 10 ? String(yearsExperience) : "")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomYears(val);
                                                setEditedArtist({ ...editedArtist, yearsExperience: parseInt(val) || 0 });
                                            }}
                                            className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center w-full mt-2"
                                            placeholder="Enter custom years"
                                        />
                                    ) : null}
                                </div>
                                <div className="flex flex-col items-center">
                                    <Label htmlFor="rate" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                        Base Rate (USD/hr)
                                    </Label>
                                    <Select
                                        value={rateValue || "custom"}
                                        onValueChange={(value) => {
                                            if (value === "custom") {
                                                setCustomRate(baseRate > 0 ? String(baseRate) : "");
                                            } else {
                                                setEditedArtist({ ...editedArtist, baseRate: parseInt(value) || 0 });
                                                setCustomRate("");
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={clsx(triggerBase, "w-full")}>
                                            <SelectValue placeholder="Select rate" />
                                        </SelectTrigger>
                                        <SelectContent className={contentBase} position="popper" align="start">
                                            {BASE_RATE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value} className={itemCentered}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="custom" className={itemCentered}>
                                                Custom (enter below)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {customRate !== "" || (baseRate > 0 && !BASE_RATE_OPTIONS.find(opt => parseInt(opt.value) === baseRate)) ? (
                                        <Input
                                            type="number"
                                            min="0"
                                            value={customRate || (baseRate > 0 ? String(baseRate) : "")}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomRate(val);
                                                setEditedArtist({ ...editedArtist, baseRate: parseInt(val) || 0 });
                                            }}
                                            className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center w-full mt-2"
                                            placeholder="Enter custom rate"
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            Specialty Styles
                        </h2>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-lg border justify-center"
                                style={{
                                    background: "color-mix(in oklab, var(--elevated) 40%, transparent)",
                                    borderColor: "var(--border)"
                                }}>
                                {stylesClean.length > 0 ? stylesClean.map((style) => (
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
                            <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
                                <Select
                                    value={selectedStyle}
                                    onValueChange={(value) => {
                                        setSelectedStyle(value);
                                    }}
                                >
                                    <SelectTrigger className={clsx(triggerBase, "w-full")}>
                                        <SelectValue placeholder="Select a style" />
                                    </SelectTrigger>
                                    <SelectContent className={contentBase} position="popper" align="start">
                                        {STYLE_OPTIONS.map((style) => (
                                            <SelectItem key={style} value={style} className={itemCentered}>
                                                {style}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedStyle && (
                                    <Button
                                        onClick={handleAddStyle}
                                        size="sm"
                                        style={{ background: "var(--fg)", color: "var(--bg)" }}
                                        className="hover:opacity-90 font-semibold w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Selected Style
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            Won't Tattoo
                        </h2>
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-lg border justify-center"
                                style={{
                                    background: "color-mix(in oklab, var(--elevated) 40%, transparent)",
                                    borderColor: "var(--border)"
                                }}>
                                {wontTattooClean.length > 0 ? wontTattooClean.map((item: string) => (
                                    <span
                                        key={item}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all hover:scale-105"
                                        style={{
                                            borderColor: "var(--border)",
                                            background: "linear-gradient(135deg, color-mix(in oklab, var(--elevated) 95%, var(--fg) 5%), color-mix(in oklab, var(--elevated) 85%, var(--fg) 15%))",
                                            color: "var(--fg)"
                                        }}
                                    >
                                        {item}
                                        <button
                                            onClick={() => handleRemoveWontTattoo(item)}
                                            className="hover:text-red-400 transition-colors hover:scale-110"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                )) : (
                                    <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                        No restrictions added yet
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
                                <Input
                                    type="text"
                                    value={selectedWontTattoo}
                                    onChange={(e) => setSelectedWontTattoo(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddWontTattoo();
                                        }
                                    }}
                                    className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center"
                                    placeholder="Enter what you won't tattoo (e.g. faces, hands, etc.)"
                                />
                                {selectedWontTattoo && (
                                    <Button
                                        onClick={handleAddWontTattoo}
                                        size="sm"
                                        style={{ background: "var(--fg)", color: "var(--bg)" }}
                                        className="hover:opacity-90 font-semibold w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Restriction
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {portfolio.length > 0 && (
                        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                            <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                Portfolio Images
                            </h2>
                            <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible justify-center items-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                {portfolio.map((src, i) => (
                                    <div key={i} className="relative aspect-square flex-shrink-0 w-28 sm:w-full group sm:first:ml-0 sm:last:mr-0">
                                        <div className="absolute inset-0 rounded-lg overflow-hidden border border-[color:var(--border)]">
                                            <img
                                                src={src}
                                                alt={`Portfolio ${i + 1}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newPortfolio = portfolio.filter((_, idx) => idx !== i);
                                                setEditedArtist({ ...editedArtist, portfolioImages: newPortfolio });
                                            }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {portfolio.length < 10 && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={() => portfolioInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full max-w-md border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-[color:var(--elevated)] transition-colors disabled:opacity-50 py-4"
                                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                                    >
                                        <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
                                        <span className="text-sm">Add Image</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {healedWorks.length > 0 && (
                        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                            <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                Healed Works
                            </h2>
                            <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible justify-center items-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                {healedWorks.map((src, i) => (
                                    <div key={i} className="relative aspect-square flex-shrink-0 w-28 sm:w-full sm:first:ml-0 sm:last:mr-0">
                                        <div className="absolute inset-0 rounded-lg overflow-hidden border border-[color:var(--border)]">
                                            <img
                                                src={src}
                                                alt={`Healed work ${i + 1}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sketches.length > 0 && (
                        <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                            <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                Sketches
                            </h2>
                            <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible justify-center items-center" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                                {sketches.map((src, i) => (
                                    <div key={i} className="relative aspect-square flex-shrink-0 w-28 sm:w-full sm:first:ml-0 sm:last:mr-0">
                                        <div className="absolute inset-0 rounded-lg overflow-hidden border border-[color:var(--border)]">
                                            <img
                                                src={src}
                                                alt={`Sketch ${i + 1}`}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {hasChanges && (
                    <div className="sticky bottom-4 flex justify-center md:justify-end pt-4">
                        <Button
                            onClick={saveProfile}
                            disabled={saving || uploading}
                            size="lg"
                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                            className="hover:opacity-90 shadow-lg w-full md:w-auto"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save All Changes"}
                        </Button>
                    </div>
                )}
                </div>
            </div>

            <div className="w-full md:w-[48%] flex-shrink-0 rounded-xl p-4 md:p-6 flex flex-col overflow-y-auto">
                <h2 className="text-lg md:text-xl font-semibold flex items-center justify-center gap-2 mb-4 flex-shrink-0" style={{ color: "var(--fg)" }}>
                    <Calendar className="h-5 w-5" />
                    Appointment History
                </h2>
                <div className="flex-1 min-h-0 pb-4">
                    {loadingBookings ? (
                        <div className="text-center py-8" style={{ color: "var(--fg)" }}>
                            Loading appointments...
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-8" style={{ color: "var(--fg)" }}>
                            No appointments yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map((booking) => {
                                const startDate = new Date(booking.startAt);
                                const endDate = new Date(booking.endAt);
                                const isPast = endDate < new Date();
                                const statusColors: Record<string, string> = {
                                    pending: "bg-yellow-500/15 text-yellow-300 border-yellow-600/30",
                                    confirmed: "bg-green-500/15 text-green-300 border-green-600/30",
                                    "in-progress": "bg-blue-500/15 text-blue-300 border-blue-600/30",
                                    completed: "bg-green-500/15 text-green-300 border-green-600/30",
                                    cancelled: "bg-red-500/15 text-red-300 border-red-600/30",
                                    "no-show": "bg-gray-500/15 text-gray-300 border-gray-600/30",
                                };
                                
                                const statusLabels: Record<string, string> = {
                                    pending: "Pending",
                                    confirmed: "Confirmed",
                                    "in-progress": "In Progress",
                                    completed: "Completed",
                                    cancelled: "Cancelled",
                                    "no-show": "No Show",
                                };
                                
                                return (
                                    <div
                                        key={booking._id}
                                        className="rounded-lg border p-4"
                                        style={{
                                            borderColor: "var(--border)",
                                            background: "color-mix(in oklab, var(--elevated) 50%, transparent)",
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="h-4 w-4" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }} />
                                                    <span className="text-sm font-medium" style={{ color: "var(--fg)" }}>
                                                        {startDate.toLocaleDateString(undefined, {
                                                            weekday: "short",
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </span>
                                                    <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                        {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                {booking.note && (
                                                    <p className="text-sm mb-2" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                                        {booking.note}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="px-2 py-1 rounded text-xs font-medium border"
                                                        style={{
                                                            ...(statusColors[booking.status] ? {} : { background: "var(--elevated)", color: "var(--fg)", borderColor: "var(--border)" }),
                                                        }}
                                                    >
                                                        {statusLabels[booking.status] || booking.status}
                                                    </span>
                                                    {isPast && booking.status !== "cancelled" && booking.status !== "completed" && (
                                                        <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                                            Past
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
