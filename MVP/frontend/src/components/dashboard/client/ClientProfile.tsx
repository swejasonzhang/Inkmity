import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useTheme } from "@/hooks/useTheme";
import { API_URL } from "@/lib/http";
import { Save, X, Camera, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Client {
    _id: string;
    username: string;
    bio?: string;
    location?: string;
    profileImage?: string;
    coverImage?: string;
    clerkId?: string;
    avatar?: { url?: string; publicId?: string };
    references?: string[];
    budgetMin?: number;
    budgetMax?: number;
    placement?: string;
    size?: string;
    messageToArtists?: string;
}

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
    "Finger",
    "Other",
];

const SIZE_OPTIONS = [
    { value: "tiny", label: "Tiny (≤ 2 in)" },
    { value: "small", label: "Small (2–4 in)" },
    { value: "medium", label: "Medium (4–6 in)" },
    { value: "large", label: "Large (6–10 in)" },
    { value: "xl", label: "XL (10–14 in)" },
    { value: "xxl", label: "XXL (≥ 14 in)" },
];

const CITY_JSON_URL = "/us-cities.min.json";

const fallbackCities = [
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

const MIN = 100;
const MAX = 5000;
const STEP = 50;
const MIN_GAP = 100;
const PRESET_STORAGE_KEY = "inkmity_artist_filters";

const priceBucketFromRange = (lo: number, hi: number) => {
    if (lo <= MIN && hi >= MAX) return "all";
    if (hi <= 500) return "100-500";
    if (hi <= 1000) return "500-1000";
    if (hi <= 2000) return "1000-2000";
    if (hi <= 5000) return "2000-5000";
    return "5000+";
};

export default function ClientProfile() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [client, setClient] = useState<Client | null>(null);
    const [editedClient, setEditedClient] = useState<Partial<Client>>({});
    const [uploading, setUploading] = useState(false);
    const [cities, setCities] = useState<string[]>(fallbackCities);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const loadStartTimeRef = useRef<number>(Date.now());
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadStartTimeRef.current = Date.now();
        loadProfile();
    }, []);

    useEffect(() => {
        if (profileLoaded) {
            const elapsed = Date.now() - loadStartTimeRef.current;
            const remaining = Math.max(0, 400 - elapsed);
            setTimeout(() => {
                setLoading(false);
            }, remaining);
        }
    }, [profileLoaded]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch(CITY_JSON_URL, { cache: "force-cache" });
                if (!res.ok) throw new Error(String(res.status));
                const json = (await res.json()) as Array<{ city: string; state_code?: string; state?: string }>;
                const seen = new Set<string>();
                const list: string[] = [];
                for (const item of json) {
                    const stateCode = (item.state_code || "").toUpperCase();
                    const stateName = item.state || "";
                    const label = stateCode ? `${item.city}, ${stateCode}` : `${item.city}, ${stateName}`;
                    const key = label.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push(label);
                    }
                }
                list.sort((a, b) => a.localeCompare(b));
                if (active) setCities(list);
            } catch {
                if (active) setCities(fallbackCities);
            }
        })();
        return () => {
            active = false;
        };
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
            const clientData: Client = {
                _id: data._id || "",
                username: data.username || "",
                bio: data.bio || "",
                location: data.location || "",
                profileImage: data.avatar?.url || data.profileImage || data.avatarUrl || "",
                coverImage: data.coverImage || "",
                avatar: data.avatar,
                references: Array.isArray(data.references) ? data.references : [],
                budgetMin: data.budgetMin ?? 100,
                budgetMax: data.budgetMax ?? 200,
                placement: data.placement || "",
                size: data.size || "",
                messageToArtists: data.messageToArtists || "",
            };
            setClient(clientData);
            setEditedClient({});
            setProfileLoaded(true);
        } catch (error) {
            console.error("Failed to load profile:", error);
            setProfileLoaded(true);
        }
    };

    const handleImageUpload = async (file: File, type: "avatar" | "cover" | "reference") => {
        try {
            setUploading(true);
            const token = await getToken();

            const sigResponse = await fetch(
                type === "avatar"
                    ? `${API_URL}/users/avatar/signature`
                    : type === "cover"
                    ? `${API_URL}/images/sign?kind=client_cover`
                    : `${API_URL}/images/sign?kind=client_ref`,
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
                setEditedClient(prev => ({ ...prev, coverImage: newCoverUrl }));
            } else if (type === "reference") {
                const currentRefs = editedClient.references || client?.references || [];
                if (currentRefs.length < 3) {
                    const newRefs = [...currentRefs, uploadData.secure_url || uploadData.url];
                    setEditedClient(prev => ({ ...prev, references: newRefs }));
                }
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveReference = (index: number) => {
        const currentRefs = editedClient.references || client?.references || [];
        const newRefs = currentRefs.filter((_, i) => i !== index);
        setEditedClient(prev => ({ ...prev, references: newRefs }));
    };

    const saveProfile = async () => {
        if (!user || !client) return;
        try {
            setSaving(true);
            const token = await getToken();
            const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
            const username = editedClient.username || client.username || user.firstName || email.split("@")[0] || "user";

            const budgetMin = Math.max(MIN, Math.min(MAX, Number(editedClient.budgetMin ?? client.budgetMin ?? 100)));
            const budgetMax = Math.max(budgetMin + MIN_GAP, Math.min(MAX, Number(editedClient.budgetMax ?? client.budgetMax ?? 200)));
            const refs = (editedClient.references || client.references || []).slice(0, 3);

            const response = await fetch(`${API_URL}/users/sync`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clerkId: user.id,
                    email,
                    role: "client",
                    username,
                    profile: {
                        location: editedClient.location ?? client.location,
                        coverImage: editedClient.coverImage ?? client.coverImage,
                        budgetMin,
                        budgetMax,
                        placement: editedClient.placement ?? client.placement,
                        size: editedClient.size ?? client.size,
                        referenceImages: refs,
                        messageToArtists: editedClient.messageToArtists ?? client.messageToArtists ?? "",
                    },
                    bio: editedClient.bio ?? client.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");

            await loadProfile();
            setEditedClient({});
            
            try {
                const savedLocation = editedClient.location ?? client.location;
                const savedBudgetMin = budgetMin;
                const savedBudgetMax = budgetMax;
                
                const existingPreset = typeof window !== "undefined" 
                    ? (() => {
                        try {
                            const raw = localStorage.getItem(PRESET_STORAGE_KEY);
                            return raw ? JSON.parse(raw) : {};
                        } catch {
                            return {};
                        }
                    })()
                    : {};
                
                const updatedPreset: Record<string, string> = { ...existingPreset };
                
                if (savedLocation && savedLocation.trim()) {
                    updatedPreset.locationFilter = savedLocation.trim();
                }
                
                const priceBucket = priceBucketFromRange(savedBudgetMin, savedBudgetMax);
                if (priceBucket !== "all") {
                    updatedPreset.priceFilter = priceBucket;
                }
                
                if (typeof window !== "undefined") {
                    if (Object.keys(updatedPreset).length > 0) {
                        localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updatedPreset));
                    }
                }
            } catch (error) {
                console.error("Failed to sync filters:", error);
            }
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const currentUsername = editedClient.username ?? client?.username ?? "";
    const currentBio = editedClient.bio ?? client?.bio ?? "";
    const currentLocation = editedClient.location ?? client?.location ?? "";
    const currentProfileImage = editedClient.profileImage ?? client?.profileImage;
    const currentCoverImage = editedClient.coverImage ?? client?.coverImage;
    const currentReferences = editedClient.references ?? client?.references ?? [];
    const currentBudgetMin = editedClient.budgetMin ?? client?.budgetMin ?? 100;
    const currentBudgetMax = editedClient.budgetMax ?? client?.budgetMax ?? 200;
    const currentPlacement = editedClient.placement ?? client?.placement ?? "";
    const currentSize = editedClient.size ?? client?.size ?? "";
    const currentMessage = editedClient.messageToArtists ?? client?.messageToArtists ?? "";
    
    const hasChanges = useMemo(() => {
        if (!client) return false;
        return (
            currentUsername !== (client.username ?? "") ||
            currentBio !== (client.bio ?? "") ||
            currentLocation !== (client.location ?? "") ||
            currentCoverImage !== (client.coverImage ?? "") ||
            currentBudgetMin !== (client.budgetMin ?? 100) ||
            currentBudgetMax !== (client.budgetMax ?? 200) ||
            currentPlacement !== (client.placement ?? "") ||
            currentSize !== (client.size ?? "") ||
            currentMessage !== (client.messageToArtists ?? "") ||
            JSON.stringify(currentReferences) !== JSON.stringify(client.references ?? [])
        );
    }, [currentUsername, currentBio, currentLocation, currentCoverImage, currentBudgetMin, currentBudgetMax, currentPlacement, currentSize, currentMessage, currentReferences, client]);

    const initials = useMemo(() => (currentUsername || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [currentUsername]);
    const loc = currentLocation?.trim() || "";

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    const snap = (v: number) => Math.round(v / STEP) * STEP;
    const budgetMin = clamp(snap(currentBudgetMin), MIN, MAX - MIN_GAP);
    const budgetMax = clamp(snap(currentBudgetMax), budgetMin + MIN_GAP, MAX);

    if (loading) {
        const LOAD_MS = 400;
        const bg = theme === "light" ? "#ffffff" : "#0b0b0b";
        const fg = theme === "light" ? "#111111" : "#f5f5f5";
        return (
            <div
                className="fixed inset-0 grid place-items-center"
                style={{ zIndex: 2147483640, background: bg, color: fg }}
            >
                <style>{`
                    @keyframes ink-fill { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
                    @keyframes ink-pulse { 0%,100% { opacity:.4;} 50% {opacity:1;} }
                `}</style>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-56 h-2 rounded overflow-hidden" style={{ background: "rgba(0,0,0,0.1)" }}>
                        <div className="h-full origin-left" style={{ background: fg, transform: "scaleX(0)", animation: `ink-fill ${LOAD_MS}ms linear forwards` }} />
                    </div>
                    <div className="text-xs tracking-widest uppercase" style={{ letterSpacing: "0.2em", opacity: 0.8, animation: "ink-pulse 1.2s ease-in-out infinite" }}>
                        Loading
                    </div>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex items-center justify-center h-full">
                <div style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>No profile data available</div>
            </div>
        );
    }

    const defaultMessage = `Hi! I'm interested in getting a tattoo. I've attached some reference images that show the style and vibe I'm going for. My budget is around $${budgetMin}-$${budgetMax}. ${currentLocation ? `I'm located in ${currentLocation}.` : ""} ${currentPlacement ? `I'm looking for something on my ${currentPlacement.toLowerCase()}.` : ""} ${currentSize ? `Size preference: ${SIZE_OPTIONS.find(s => s.value === currentSize)?.label || currentSize}.` : ""} Let me know if you're available and interested!`;

    return (
        <div className="h-full min-h-0 w-full overflow-y-auto flex items-start justify-center py-4 px-4" style={{ maxHeight: "100%" }}>
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
                ref={referenceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "reference")}
            />
            <div className="group w-full max-w-4xl flex flex-col rounded-3xl transition relative p-8 items-center overflow-y-auto" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 95%, var(--fg) 5%), color-mix(in oklab, var(--bg) 75%, var(--fg) 25%))", maxHeight: "100%" }}>
                <div className="flex flex-col items-center justify-center text-center gap-1 w-full max-w-2xl relative">

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
                        className="mb-4 border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                    >
                        <Camera className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : (currentCoverImage ? "Change Background" : "Add Background")}
                    </Button>

                    <div className="flex flex-col items-center w-full mt-2 min-h-[2.5rem]">
                        <div className="relative inline-flex items-center gap-2 group">
                            <Input
                                type="text"
                                value={currentUsername}
                                onChange={(e) => setEditedClient({ ...editedClient, username: e.target.value })}
                                className="text-xl md:text-2xl font-extrabold tracking-tight text-center border-none bg-transparent focus:ring-0 focus:outline-none shadow-none px-2"
                                style={{ color: "var(--fg)" }}
                                placeholder="Your name"
                            />
                            <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: "var(--fg)" }} />
                        </div>
                    </div>

                    <div className="w-full flex justify-center mt-2 min-h-[3rem]">
                        <textarea
                            value={currentBio}
                            onChange={(e) => setEditedClient({ ...editedClient, bio: e.target.value })}
                            className="w-full max-w-prose bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-xs md:text-sm text-center"
                            rows={3}
                            style={{ color: "var(--fg)" }}
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    {loc && (
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm min-h-[2rem]">
                            <span
                                className="rounded-full px-2.5 py-1 border"
                                style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
                            >
                                {loc}
                            </span>
                        </div>
                    )}

                    <div className="w-full mt-8 space-y-6">
                        <div className="rounded-2xl p-6 border backdrop-blur-sm w-full"
                            style={{
                                background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            <h3 className="text-sm font-semibold mb-4 text-center" style={{ color: "var(--fg)" }}>
                                Base Filters
                            </h3>
                            
                            <div className="flex flex-col items-center justify-center space-y-4 w-full">
                                <div className="w-full max-w-md">
                                    <Label className="text-xs mb-2 block text-center" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                        Budget Range: ${budgetMin} - ${budgetMax}
                                    </Label>
                                    <Slider
                                        value={[budgetMin, budgetMax]}
                                        min={MIN}
                                        max={MAX}
                                        step={STEP}
                                        onValueChange={([min, max]) => {
                                            const clampedMin = clamp(snap(min), MIN, MAX - MIN_GAP);
                                            const clampedMax = clamp(snap(max), clampedMin + MIN_GAP, MAX);
                                            setEditedClient({ ...editedClient, budgetMin: clampedMin, budgetMax: clampedMax });
                                        }}
                                        className="w-full"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-2xl">
                                    <div className="w-full sm:w-[260px] sm:shrink-0">
                                        <Label className="text-xs mb-2 block text-center" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                            City
                                        </Label>
                                        <Select
                                            value={currentLocation || "none"}
                                            onValueChange={(v) => setEditedClient({ ...editedClient, location: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger className="h-10 sm:h-14 bg-elevated border-app text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full px-4">
                                                <SelectValue placeholder="No preference" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start">
                                                <SelectItem value="none" className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">No preference</SelectItem>
                                                {cities.map((city) => (
                                                    <SelectItem key={city} value={city} className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">{city}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full sm:w-[260px] sm:shrink-0">
                                        <Label className="text-xs mb-2 block text-center" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                            Placement
                                        </Label>
                                        <Select
                                            value={currentPlacement || "none"}
                                            onValueChange={(v) => setEditedClient({ ...editedClient, placement: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger className="h-10 sm:h-14 bg-elevated border-app text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full px-4">
                                                <SelectValue placeholder="No preference" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start">
                                                <SelectItem value="none" className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">No preference</SelectItem>
                                                {PLACEMENT_OPTIONS.map((p) => (
                                                    <SelectItem key={p} value={p} className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full sm:w-[260px] sm:shrink-0">
                                        <Label className="text-xs mb-2 block text-center" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
                                            Size
                                        </Label>
                                        <Select
                                            value={currentSize || "none"}
                                            onValueChange={(v) => setEditedClient({ ...editedClient, size: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger className="h-10 sm:h-14 bg-elevated border-app text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full px-4">
                                                <SelectValue placeholder="No preference" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start">
                                                <SelectItem value="none" className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">No preference</SelectItem>
                                                {SIZE_OPTIONS.map((s) => (
                                                    <SelectItem key={s.value} value={s.value} className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0">{s.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border backdrop-blur-sm w-full"
                            style={{
                                background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--fg)" }}>
                                Message to Artists
                            </h3>
                            <textarea
                                value={currentMessage}
                                onChange={(e) => setEditedClient({ ...editedClient, messageToArtists: e.target.value })}
                                className="w-full bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-sm"
                                rows={4}
                                style={{ color: "var(--fg)" }}
                                placeholder={defaultMessage}
                            />
                            
                            <div className="flex items-center justify-between mt-6 mb-4">
                                <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                                    Reference Images {currentReferences.length > 0 && `(${currentReferences.length}/3)`}
                                </h3>
                                {currentReferences.length < 3 && (
                                    <Button
                                        onClick={() => referenceInputRef.current?.click()}
                                        disabled={uploading}
                                        size="sm"
                                        variant="outline"
                                        className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {uploading ? "Uploading..." : "Add Image"}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {currentReferences.map((url, index) => (
                                    <div
                                        key={index}
                                        className="relative aspect-square rounded-xl border overflow-hidden group"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                    >
                                        <img
                                            src={url}
                                            alt={`Reference ${index + 1}`}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                        <button
                                            onClick={() => handleRemoveReference(index)}
                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                    </div>
                                ))}
                                {currentReferences.length < 3 && (
                                    <button
                                        onClick={() => referenceInputRef.current?.click()}
                                        disabled={uploading}
                                        className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-[color:var(--elevated)] transition-colors"
                                        style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                                    >
                                        <Plus className="h-6 w-6" />
                                        <span className="text-xs">Add Reference</span>
                                    </button>
                                )}
                            </div>
                            {currentReferences.length === 0 && (
                                <div className="text-sm text-center mt-4" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                    No reference images added
                                </div>
                            )}
                            {hasChanges && (
                                <div className="flex gap-2 justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                                    <Button
                                        onClick={() => {
                                            setEditedClient({});
                                        }}
                                        size="sm"
                                        variant="outline"
                                        className="border-[color:var(--border)] hover:bg-[color:var(--elevated)]"
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
                                        {saving ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
