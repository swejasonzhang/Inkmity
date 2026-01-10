import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Edit2, X, Plus, Camera, Briefcase, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadToCloudinary } from "@/lib/cloudinary";
import ArtistAppointmentHistory from "./ArtistAppointmentHistory";

const PLACEMENT_OPTIONS = [
    "Forearm",
    "Upper arm",
    "Full arm sleeve",
    "Half sleeve",
    "Wrist",
    "Hand",
    "Shoulder",
    "Chest",
    "Ribs",
    "Back",
    "Stomach",
    "Hip",
    "Thigh",
    "Calf",
    "Ankle",
    "Foot",
    "Neck",
    "Ear",
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

const CITIES = [
    "New York, NY",
    "Los Angeles, CA",
    "Chicago, IL",
    "Houston, TX",
    "Phoenix, AZ",
    "Philadelphia, PA",
    "San Antonio, TX",
    "San Diego, CA",
    "Dallas, TX",
    "San Jose, CA",
    "Austin, TX",
    "Jacksonville, FL",
    "San Francisco, CA",
    "Columbus, OH",
    "Fort Worth, TX",
    "Indianapolis, IN",
    "Charlotte, NC",
    "Seattle, WA",
    "Denver, CO",
    "Washington, DC",
    "Boston, MA",
    "Nashville, TN",
    "El Paso, TX",
    "Detroit, MI",
    "Oklahoma City, OK",
    "Portland, OR",
    "Las Vegas, NV",
    "Memphis, TN",
    "Louisville, KY",
    "Baltimore, MD",
    "Milwaukee, WI",
    "Albuquerque, NM",
    "Tucson, AZ",
    "Fresno, CA",
    "Mesa, AZ",
    "Sacramento, CA",
    "Atlanta, GA",
    "Kansas City, MO",
    "Colorado Springs, CO",
    "Miami, FL",
];

const YEARS_OPTIONS = [
    { value: "0", label: "<1" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
    { value: "6", label: "6" },
    { value: "7", label: "7" },
    { value: "8", label: "8" },
    { value: "9", label: "9" },
    { value: "10", label: "10" },
    { value: "12", label: "12" },
    { value: "15", label: "15" },
    { value: "20", label: "20" },
    { value: "25", label: "25" },
    { value: "30", label: "30" },
    { value: "35", label: "35" },
    { value: "40", label: "40+" },
];

const BASE_RATE_OPTIONS = [
    { value: "100", label: "$100/hr" },
    { value: "125", label: "$125/hr" },
    { value: "150", label: "$150/hr" },
    { value: "175", label: "$175/hr" },
    { value: "200", label: "$200/hr" },
    { value: "250", label: "$250/hr" },
    { value: "300", label: "$300/hr" },
    { value: "350", label: "$350/hr" },
    { value: "400", label: "$400/hr" },
    { value: "500", label: "$500/hr" },
    { value: "600", label: "$600/hr" },
    { value: "750", label: "$750/hr" },
    { value: "1000", label: "$1,000/hr" },
];

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
    shopAddress?: string;
    shopLat?: number;
    shopLng?: number;
    avatar?: { url?: string; publicId?: string };
    restrictedPlacements?: string[];
}

export default function ArtistProfile() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [portfolioCategory, setPortfolioCategory] = useState<"pastWorks" | "recentWorks" | "sketches">("recentWorks");
    const [artist, setArtist] = useState<Artist | null>(null);
    const [editedArtist, setEditedArtist] = useState<Partial<Artist>>({});
    const [editedPastWorks, setEditedPastWorks] = useState<string[]>([]);
    const [editedRecentWorks, setEditedRecentWorks] = useState<string[]>([]);
    const [editedSketches, setEditedSketches] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [newStyle, setNewStyle] = useState("");
    const [bgOk, setBgOk] = useState(false);
    const [newRestrictedPlacement, setNewRestrictedPlacement] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const portfolioInputRef = useRef<HTMLInputElement>(null);

    const [depositDollars, setDepositDollars] = useState<string>("50.00");
    const [depositPolicySaving, setDepositPolicySaving] = useState(false);

    useEffect(() => {
        let active = true;
        if (!user?.id) return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/artist-policy/${user.id}`, { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const json = await res.json();
                const deposit = json?.deposit || {};
                const mode = deposit?.mode;
                const amountCents = Number(deposit?.amountCents || 0);
                const minCents = Number(deposit?.minCents || 0);
                const fallbackCents = Math.max(5000, minCents || 0);
                const centsToShow = mode === "flat" && amountCents > 0 ? amountCents : fallbackCents;
                if (active) setDepositDollars((centsToShow / 100).toFixed(2));
            } catch {
            }
        })();
        return () => {
            active = false;
        };
    }, [user?.id]);

    const saveDepositPolicy = async () => {
        if (!user?.id) return;
        if (depositPolicySaving) return;
        const parsed = Number(depositDollars);
        const cents = Math.round((isNaN(parsed) ? 0 : parsed) * 100);
        const enforced = Math.max(5000, cents); // tattoo-session deposits are never optional
        try {
            setDepositPolicySaving(true);
            const token = await getToken();
            const res = await fetch(`${API_URL}/artist-policy/${user.id}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    deposit: {
                        mode: "flat",
                        amountCents: enforced,
                        minCents: enforced,
                        maxCents: enforced,
                        nonRefundable: true,
                        cutoffHours: 48,
                    },
                }),
            });
            if (!res.ok) throw new Error("Failed to save deposit policy");
            setDepositDollars((enforced / 100).toFixed(2));
        } catch (e) {
            console.error("Failed to save deposit policy:", e);
            alert("Failed to save deposit. Please try again.");
        } finally {
            setDepositPolicySaving(false);
        }
    };

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
                shopAddress: data.shopAddress || "",
                shopLat: data.shopLat || undefined,
                shopLng: data.shopLng || undefined,
                avatar: data.avatar,
                restrictedPlacements: Array.isArray(data.restrictedPlacements) ? data.restrictedPlacements : [],
            };
            setArtist(artistData);
            setEditedArtist({});
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
                const newCoverUrl = uploadData.secure_url || uploadData.url;
                setEditedArtist(prev => ({ ...prev, coverImage: newCoverUrl }));
                if (artist) {
                    setArtist(prev => prev ? { ...prev, coverImage: newCoverUrl } : null);
                }
                setBgOk(true);
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

    const handleAddStyle = (style: string) => {
        if (!style.trim()) return;
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        if (!stylesArray.includes(style)) {
            setEditedArtist({ ...editedArtist, styles: [...stylesArray, style] });
        }
    };

    const handleRemoveStyle = (style: string) => {
        const currentStyles = editedArtist.styles || artist?.styles || [];
        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
        setEditedArtist({ ...editedArtist, styles: stylesArray.filter(s => s !== style) });
    };

    const handleAddRestrictedPlacement = () => {
        if (!newRestrictedPlacement.trim()) return;
        const currentRestrictions = editedArtist.restrictedPlacements ?? artist?.restrictedPlacements ?? [];
        if (!currentRestrictions.includes(newRestrictedPlacement)) {
            setEditedArtist({ ...editedArtist, restrictedPlacements: [...currentRestrictions, newRestrictedPlacement] });
        }
        setNewRestrictedPlacement("");
    };

    const handleRemoveRestrictedPlacement = (placement: string) => {
        const currentRestrictions = editedArtist.restrictedPlacements ?? artist?.restrictedPlacements ?? [];
        setEditedArtist({ ...editedArtist, restrictedPlacements: currentRestrictions.filter(p => p !== placement) });
    };

    const geocodeAddress = async (address: string) => {
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                console.warn("Google Maps API key not configured");
                return;
            }
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
            );
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                setEditedArtist(prev => ({
                    ...prev,
                    shopAddress: address,
                    shopLat: location.lat,
                    shopLng: location.lng
                }));
            }
        } catch (error) {
            console.error("Error geocoding address:", error);
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
                        shopAddress: editedArtist.shopAddress ?? artist.shopAddress,
                        shopLat: editedArtist.shopLat ?? artist.shopLat,
                        shopLng: editedArtist.shopLng ?? artist.shopLng,
                        coverImage: editedArtist.coverImage ?? artist.coverImage,
                        restrictedPlacements: editedArtist.restrictedPlacements ?? artist.restrictedPlacements ?? [],
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

    const currentUsername = editedArtist.username ?? artist?.username ?? "";
    const currentBio = editedArtist.bio ?? artist?.bio ?? "";
    const currentLocation = editedArtist.location ?? artist?.location ?? "";
    const currentShop = editedArtist.shop ?? artist?.shop ?? "";
    const currentYearsExperience = editedArtist.yearsExperience ?? artist?.yearsExperience ?? 0;
    const currentStyles = editedArtist.styles ?? artist?.styles ?? [];
    const currentProfileImage = editedArtist.profileImage ?? artist?.profileImage ?? "";
    const currentCoverImage = editedArtist.coverImage ?? artist?.coverImage ?? "";
    const currentShopAddress = editedArtist.shopAddress ?? artist?.shopAddress ?? "";
    const currentShopLat = editedArtist.shopLat ?? artist?.shopLat;
    const currentShopLng = editedArtist.shopLng ?? artist?.shopLng;
    const currentBaseRate = editedArtist.baseRate ?? artist?.baseRate ?? 0;
    const currentRestrictedPlacements = editedArtist.restrictedPlacements ?? artist?.restrictedPlacements ?? [];

    const portfolioPreview = useMemo(() => {
        const recentWorks = artist?.portfolioImages || [];
        return recentWorks.filter(Boolean).slice(0, 3);
    }, [artist?.portfolioImages]);
    const pastWorks = artist?.pastWorks || [];
    const recentWorks = artist?.portfolioImages || [];
    const healedWorks = artist?.healedWorks || [];
    const sketches = artist?.sketches || [];

    const initials = useMemo(() => (currentUsername || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [currentUsername]);

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
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 items-stretch">
                <div className="group w-full h-full flex flex-col rounded-3xl transition relative overflow-hidden p-8 items-center justify-center" style={{ background: "var(--card)" }}>
                    <div className="flex flex-col items-center justify-center text-center gap-1 w-full max-w-2xl relative flex-1 overflow-y-auto">

                    <div className="relative mb-8 w-full flex items-center justify-center group">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 w-full sm:h-44 md:h-48 overflow-hidden pointer-events-none rounded-lg" style={{ background: "var(--elevated)" }}>
                            {bgOk && currentCoverImage ? (
                                <img
                                    src={currentCoverImage}
                                    alt="Background"
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={() => setBgOk(false)}
                                />
                            ) : (
                                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
                            )}
                            <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
                        </div>
                        <div className="relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] transition-all duration-300 h-28 w-28 sm:h-32 sm:w-32 md:h-40 md:w-40" style={{ border: `1px solid var(--border)`, background: "var(--card)", zIndex: 1 }}>
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
                            <button
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                                style={{ zIndex: 20 }}
                            >
                                <Camera className="h-5 w-5 text-white hover:scale-110 transition-transform" />
                                <span className="text-xs text-white/80">Change</span>
                            </button>
                        </div>
                    </div>

                    <Button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploading}
                        size="sm"
                        variant="outline"
                        className="mb-4 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : (currentCoverImage ? "Change Background" : "Add Background")}
                    </Button>

                    <div className="space-y-2 w-full max-w-md mb-4">
                        <Label htmlFor="username" className="text-center block w-full text-sm" style={{ color: "var(--fg)" }}>Display Name</Label>
                        <Input
                            id="username"
                            type="text"
                            value={currentUsername}
                            onChange={(e) => setEditedArtist({ ...editedArtist, username: e.target.value })}
                            className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                            placeholder="Your name"
                        />
                    </div>

                    <div className="space-y-2 w-full max-w-md mb-4">
                        <Label htmlFor="bio" className="text-center block w-full text-sm" style={{ color: "var(--fg)" }}>Bio</Label>
                        <textarea
                            id="bio"
                            value={currentBio}
                            onChange={(e) => setEditedArtist({ ...editedArtist, bio: e.target.value })}
                            className="w-full bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-sm transition-all text-center"
                            rows={3}
                            style={{ color: "var(--fg)" }}
                            placeholder="Tell clients about yourself..."
                        />
                    </div>

                    <div className="rounded-2xl p-4 border backdrop-blur-sm w-full max-w-2xl mb-4"
                        style={{
                            background: "color-mix(in oklab, var(--card) 80%, transparent)",
                            borderColor: "var(--border)"
                        }}>
                        <h3 className="text-sm font-semibold mb-4 flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <Briefcase className="h-4 w-4" style={{ color: "var(--fg)" }} />
                            Professional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-xs text-center block w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                    Location
                                </Label>
                                <Select
                                    value={currentLocation || "none"}
                                    onValueChange={(v) => setEditedArtist({ ...editedArtist, location: v === "none" ? "" : v })}
                                >
                                    <SelectTrigger className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs h-8 w-full justify-center [&>span]:text-center [&>span]:flex [&>span]:justify-center">
                                        <SelectValue placeholder="Select city" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-app rounded-xl max-h-[300px] overflow-y-auto" position="popper" side="bottom" align="center" avoidCollisions={false}>
                                        <SelectItem value="none" className="text-center justify-center">No preference</SelectItem>
                                        {CITIES.map((city) => (
                                            <SelectItem key={city} value={city} className="text-center justify-center">{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="years" className="text-xs text-center block w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                    Years Experience
                                </Label>
                                <Select
                                    value={String(currentYearsExperience)}
                                    onValueChange={(v) => setEditedArtist({ ...editedArtist, yearsExperience: parseInt(v) || 0 })}
                                >
                                    <SelectTrigger className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs h-8 w-full justify-center [&>span]:text-center [&>span]:flex [&>span]:justify-center">
                                        <SelectValue placeholder="Select years" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-app rounded-xl max-h-[300px] overflow-y-auto" position="popper" side="bottom" align="center" avoidCollisions={false}>
                                        {YEARS_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value} className="text-center justify-center">{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate" className="text-xs text-center block w-full whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                    Base Rate (USD/hr)
                                </Label>
                                <Select
                                    value={String(currentBaseRate)}
                                    onValueChange={(v) => setEditedArtist({ ...editedArtist, baseRate: parseInt(v) || 0 })}
                                >
                                    <SelectTrigger className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs h-8 w-full justify-center [&>span]:text-center [&>span]:flex [&>span]:justify-center">
                                        <SelectValue placeholder="Select rate" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card text-app rounded-xl max-h-[300px] overflow-y-auto" position="popper" side="bottom" align="center" avoidCollisions={false}>
                                        {BASE_RATE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value} className="text-center justify-center">{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2 mt-4">
                            <Label htmlFor="shop" className="text-xs text-center block w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                Shop Name
                            </Label>
                            <Input
                                id="shop"
                                type="text"
                                value={currentShop}
                                onChange={(e) => setEditedArtist({ ...editedArtist, shop: e.target.value })}
                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs mb-2"
                                placeholder="Shop name"
                            />
                            <Label htmlFor="shopAddress" className="text-xs flex items-center justify-center gap-2 w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                Shop Address
                            </Label>
                            <Input
                                id="shopAddress"
                                type="text"
                                value={currentShopAddress}
                                onChange={(e) => {
                                    const address = e.target.value;
                                    setEditedArtist({ ...editedArtist, shopAddress: address });
                                    if (address.trim()) {
                                        clearTimeout((window as any).geocodeTimeout);
                                        (window as any).geocodeTimeout = setTimeout(() => {
                                            geocodeAddress(address);
                                        }, 1000);
                                    } else {
                                        setEditedArtist(prev => ({ ...prev, shopLat: undefined, shopLng: undefined }));
                                    }
                                }}
                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs"
                                placeholder="Enter shop address"
                            />
                            {currentShopLat && currentShopLng && (
                                <div className="mt-2 w-full h-48 rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${currentShopLat},${currentShopLng}`}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className="rounded-2xl p-4 border backdrop-blur-sm w-full max-w-2xl mb-4"
                        style={{
                            background: "color-mix(in oklab, var(--card) 80%, transparent)",
                            borderColor: "var(--border)"
                        }}
                    >
                        <h3 className="text-sm font-semibold mb-4 text-center" style={{ color: "var(--fg)" }}>
                            Deposit Settings
                        </h3>
                        <div className="space-y-2">
                            <Label className="text-xs text-center block w-full" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                Required Deposit (USD)
                            </Label>
                            <Input
                                inputMode="decimal"
                                value={depositDollars}
                                onChange={(e) => setDepositDollars(e.target.value)}
                                className="bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center"
                                placeholder="50.00"
                            />
                            <p className="text-xs text-center" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                Clients must pay this deposit to book a tattoo session. Minimum $50.00.
                            </p>
                            <div className="pt-2 flex justify-center">
                                <Button
                                    onClick={saveDepositPolicy}
                                    disabled={depositPolicySaving}
                                    size="sm"
                                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                                    className="hover:opacity-90 font-semibold"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {depositPolicySaving ? "Saving..." : "Save Deposit"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl p-4 border backdrop-blur-sm w-full max-w-2xl mb-4"
                        style={{
                            background: "color-mix(in oklab, var(--card) 80%, transparent)",
                            borderColor: "var(--border)"
                        }}>
                        <Label className="text-sm font-semibold mb-3 flex items-center justify-center gap-2 w-full" style={{ color: "var(--fg)" }}>
                            Specialty Styles
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[42px] p-3 rounded-lg border justify-center"
                            style={{
                                background: "color-mix(in oklab, var(--elevated) 40%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            {(() => {
                                const rawStyles = currentStyles;
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
                            <Select
                                value={newStyle}
                                onValueChange={(v) => {
                                    setNewStyle(v);
                                    handleAddStyle(v);
                                    setNewStyle("");
                                }}
                            >
                                <SelectTrigger className="flex-1 bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-center text-xs h-8 justify-center [&>span]:text-center [&>span]:flex [&>span]:justify-center">
                                    <SelectValue placeholder="Select a style to add" />
                                </SelectTrigger>
                                <SelectContent className="bg-card text-app rounded-xl max-h-[300px] overflow-y-auto" position="popper" side="bottom" align="center" avoidCollisions={false}>
                                    {STYLE_OPTIONS.filter(s => {
                                        const currentStyles = editedArtist.styles ?? artist?.styles ?? [];
                                        const stylesArray = Array.isArray(currentStyles) ? currentStyles : [];
                                        return !stylesArray.includes(s);
                                    }).map((style) => (
                                        <SelectItem key={style} value={style} className="text-center justify-center">{style}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="rounded-2xl p-4 border backdrop-blur-sm w-full max-w-2xl mb-4"
                        style={{
                            background: "color-mix(in oklab, var(--card) 80%, transparent)",
                            borderColor: "var(--border)"
                        }}>
                        <Label className="text-sm font-semibold mb-3 flex items-center justify-center gap-2 w-full" style={{ color: "var(--fg)" }}>
                            Body Placements I Don't Tattoo
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-3 min-h-[42px] p-3 rounded-lg border justify-center"
                            style={{
                                background: "color-mix(in oklab, var(--elevated) 40%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            {currentRestrictedPlacements.length > 0 ? (
                                currentRestrictedPlacements.map((placement: string) => (
                                    <span
                                        key={placement}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all hover:scale-105"
                                        style={{
                                            borderColor: "var(--border)",
                                            background: "linear-gradient(135deg, color-mix(in oklab, var(--elevated) 95%, var(--fg) 5%), color-mix(in oklab, var(--elevated) 85%, var(--fg) 15%))",
                                            color: "var(--fg)"
                                        }}
                                    >
                                        {placement}
                                        <button
                                            onClick={() => handleRemoveRestrictedPlacement(placement)}
                                            className="hover:text-red-400 transition-colors hover:scale-110"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                    No restrictions added
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 w-full">
                            <Select value={newRestrictedPlacement} onValueChange={setNewRestrictedPlacement}>
                                <SelectTrigger className="flex-1 bg-[color:var(--elevated)]/50 border-[color:var(--border)] focus:border-[color:var(--fg)] focus:ring-[color:var(--fg)]/20 text-xs h-8 justify-center [&>span]:text-center [&>span]:flex [&>span]:justify-center">
                                    <SelectValue placeholder="Select a body placement" />
                                </SelectTrigger>
                                <SelectContent className="bg-card text-app rounded-xl max-h-[300px] overflow-y-auto" position="popper" side="bottom" align="center" avoidCollisions={false}>
                                    {PLACEMENT_OPTIONS.filter(p => !currentRestrictedPlacements.includes(p)).map((placement) => (
                                        <SelectItem key={placement} value={placement} className="text-center justify-center">
                                            {placement}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleAddRestrictedPlacement}
                                disabled={!newRestrictedPlacement}
                                size="sm"
                                style={{ background: "var(--fg)", color: "var(--bg)" }}
                                className="hover:opacity-90 font-semibold"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl p-4 border backdrop-blur-sm w-full max-w-2xl mb-4"
                        style={{
                            background: "color-mix(in oklab, var(--card) 80%, transparent)",
                            borderColor: "var(--border)"
                        }}>
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                                Recent Works {recentWorks.length > 0 && `(${recentWorks.length})`}
                            </Label>
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
                        ) : (
                            <div className="text-sm text-center py-8" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                No portfolio images yet. Click "Manage Portfolio" to add images.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 justify-center pt-4 border-t w-full mt-4" style={{ borderColor: "var(--border)" }}>
                        <Button
                            onClick={() => setEditedArtist({})}
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
                                    <div className="flex flex-col gap-3">
                                        <p className="text-sm" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            The first 3 images will appear in your profile preview to capture clients' attention. Use arrows to reorder. All images will be visible when clients click "View Portfolio".
                                        </p>
                                        <div className="flex justify-center">
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
                                                        <div className="absolute top-2 left-2 z-10 bg-white/90 text-black text-xs font-bold px-2 py-0.5 rounded">
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
                                    <div className="flex flex-col gap-3">
                                        <p className="text-sm whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            Showcase your completed past works. Use arrows to reorder.
                                        </p>
                                        <div className="flex justify-center">
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
                                    <div className="flex flex-col gap-3">
                                        <p className="text-sm whitespace-nowrap" style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>
                                            Share your upcoming sketches and designs. Use arrows to reorder.
                                        </p>
                                        <div className="flex justify-center">
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
                <div className="w-full h-full flex flex-col rounded-3xl transition relative overflow-hidden p-8" style={{ background: "var(--card)" }}>
                    <ArtistAppointmentHistory />
                </div>
            </div>
        </div>
    );
}
