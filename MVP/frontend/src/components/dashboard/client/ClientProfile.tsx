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
import { Switch } from "@/components/ui/switch";
import { uploadToCloudinary } from "@/lib/cloudinary";
import ClientAppointmentHistory from "./ClientAppointmentHistory";

interface Client {
    _id: string;
    username: string;
    handle?: string;
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
    pieceType?: string;
    size?: string;
    messageToArtists?: string;
    visible?: boolean;
}

const PIECE_TYPE_OPTIONS = [
    "Full sleeve",
    "Half sleeve",
    "Entire back piece",
    "Leg piece",
    "Chest piece",
    "Rib piece",
    "Stomach piece",
    "Shoulder piece",
    "Forearm piece",
    "Thigh piece",
    "Calf piece",
    "Other",
];

const PLACEMENT_OPTIONS = [
    "Forearm",
    "Upper arm",
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
    const [bgOk, setBgOk] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const loadStartTimeRef = useRef<number>(Date.now());
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);
    const messageTextareaRef = useRef<HTMLTextAreaElement>(null);
    const prevValuesRef = useRef<{ budgetMin: number; budgetMax: number; location: string; placement: string; pieceType: string; size: string }>({
        budgetMin: 100,
        budgetMax: 200,
        location: "New York, NY",
        placement: "none",
        pieceType: "none",
        size: "none"
    });
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

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
                handle: data.handle || "",
                visible: data.visible !== undefined ? data.visible : true,
                bio: data.bio || "",
                location: data.location || "New York, NY",
                profileImage: data.avatar?.url || data.profileImage || data.avatarUrl || "",
                coverImage: data.coverImage || "",
                avatar: data.avatar,
                references: Array.isArray(data.references) ? data.references : [],
                budgetMin: data.budgetMin ?? 100,
                budgetMax: data.budgetMax ?? 200,
                placement: data.placement ?? "none",
                pieceType: data.pieceType ?? "none",
                size: data.size ?? "none",
                messageToArtists: "",
            };
            setClient(clientData);
            setEditedClient({});
            setBgOk(Boolean(clientData.coverImage));
            setProfileLoaded(true);
            prevValuesRef.current = {
                budgetMin: clientData.budgetMin ?? 100,
                budgetMax: clientData.budgetMax ?? 200,
                location: clientData.location ?? "New York, NY",
                placement: clientData.placement ?? "none",
                pieceType: clientData.pieceType ?? "none",
                size: clientData.size ?? "none"
            };
        } catch (error) {
            console.error("Failed to load profile:", error);
            setProfileLoaded(true);
        }
    };

    const handleImageUpload = async (file: File, type: "avatar" | "cover" | "reference", replaceIndex?: number) => {
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
                if (client) {
                    setClient(prev => prev ? { ...prev, coverImage: newCoverUrl } : null);
                }
                setBgOk(true);
            } else if (type === "reference") {
                const currentRefs = editedClient.references || client?.references || [];
                if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < currentRefs.length) {
                    const newRefs = [...currentRefs];
                    newRefs[replaceIndex] = uploadData.secure_url || uploadData.url;
                    setEditedClient(prev => ({ ...prev, references: newRefs }));
                    setReplacingIndex(null);
                } else if (currentRefs.length < 3) {
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
            const userMessage = editedClient.messageToArtists ?? "";

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
                    visible: editedClient.visible !== undefined ? editedClient.visible : (client.visible !== undefined ? client.visible : true),
                    profile: {
                        location: editedClient.location ?? client.location ?? "New York, NY",
                        coverImage: editedClient.coverImage ?? client.coverImage,
                        budgetMin,
                        budgetMax,
                        placement: editedClient.placement ?? client.placement ?? "none",
                        pieceType: editedClient.pieceType ?? client.pieceType ?? "none",
                        size: editedClient.size ?? client.size ?? "none",
                        referenceImages: refs,
                        messageToArtists: userMessage,
                    },
                    bio: editedClient.bio ?? client.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");

            await loadProfile();
            setEditedClient({});
            
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("ink:client-profile-updated"));
            }
            
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
    const currentLocation = editedClient.location ?? client?.location ?? "New York, NY";
    const currentProfileImage = editedClient.profileImage ?? client?.profileImage;
    const currentCoverImage = editedClient.coverImage ?? client?.coverImage;
    const currentReferences = editedClient.references ?? client?.references ?? [];
    const currentBudgetMin = editedClient.budgetMin ?? client?.budgetMin ?? 100;
    const currentBudgetMax = editedClient.budgetMax ?? client?.budgetMax ?? 200;
    const currentPlacement = editedClient.placement ?? client?.placement ?? "none";
    const currentPieceType = editedClient.pieceType ?? client?.pieceType ?? "none";
    const currentSize = editedClient.size ?? client?.size ?? "none";
    const currentMessage = editedClient.messageToArtists ?? "";
    
    const hasChanges = useMemo(() => {
        if (!client) return false;
        return (
            currentUsername !== (client.username ?? "") ||
            currentBio !== (client.bio ?? "") ||
            currentLocation !== (client.location ?? "New York, NY") ||
            currentCoverImage !== (client.coverImage ?? "") ||
            currentBudgetMin !== (client.budgetMin ?? 100) ||
            currentBudgetMax !== (client.budgetMax ?? 200) ||
            currentPlacement !== (client.placement ?? "none") ||
            currentPieceType !== (client.pieceType ?? "none") ||
            currentSize !== (client.size ?? "none") ||
            currentMessage !== "" ||
            JSON.stringify(currentReferences) !== JSON.stringify(client.references ?? [])
        );
    }, [currentUsername, currentBio, currentLocation, currentCoverImage, currentBudgetMin, currentBudgetMax, currentPlacement, currentPieceType, currentSize, currentMessage, currentReferences, client]);

    const initials = useMemo(() => (currentUsername || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [currentUsername]);
    const loc = currentLocation?.trim() || "";

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    const snap = (v: number) => Math.round(v / STEP) * STEP;
    
    const budgetMin = clamp(snap(currentBudgetMin), MIN, MAX - MIN_GAP);
    const budgetMax = clamp(snap(currentBudgetMax), budgetMin + MIN_GAP, MAX);

    useEffect(() => {
        const textarea = messageTextareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const minHeight = 100;
            textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
        }
    }, [currentMessage]);

    if (loading) {
        const LOAD_MS = 500;
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

    return (
        <div className="h-full min-h-0 w-full overflow-hidden flex items-start justify-center p-4">
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
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0], "reference", replacingIndex ?? undefined);
                        e.target.value = "";
                    }
                }}
            />
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0 items-stretch">
                <div className="group w-full h-full flex flex-col rounded-3xl transition relative p-6 lg:p-8 items-center overflow-hidden" style={{ background: "var(--card)" }}>
                    <div className="flex flex-col items-center justify-center text-center gap-2 w-full max-w-2xl relative z-10 flex-1 min-h-0">
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
                            <div className="relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] transition-all duration-300 h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32" style={{ border: `1px solid var(--border)`, background: "var(--card)", zIndex: 1 }}>
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
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1 hover:group"
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
                            <Camera className="h-3 w-3 mr-2" />
                            {uploading ? "Uploading..." : (currentCoverImage ? "Change Background" : "Add Background")}
                        </Button>

                        <div className="flex flex-col items-center w-full min-h-[2.5rem] px-4">
                        <div className="relative inline-flex items-center gap-2 flex-wrap justify-center">
                            {isEditingUsername ? (
                                <Input
                                    type="text"
                                    value={currentUsername}
                                    onChange={(e) => setEditedClient({ ...editedClient, username: e.target.value })}
                                    onBlur={() => setIsEditingUsername(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditingUsername(false);
                                        }
                                        if (e.key === 'Escape') {
                                            setEditedClient(prev => {
                                                const { username, ...rest } = prev;
                                                return rest;
                                            });
                                            setIsEditingUsername(false);
                                        }
                                    }}
                                    autoFocus
                                    className="text-lg md:text-xl font-extrabold tracking-tight text-center border border-[color:var(--border)] bg-[color:var(--elevated)] rounded-md focus:ring-2 focus:ring-[color:var(--fg)]/20 focus:outline-none px-3 py-1"
                                    style={{ color: "var(--fg)" }}
                                    placeholder="Your name"
                                />
                            ) : (
                                <>
                                    <span className="text-lg md:text-xl font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>
                                        {currentUsername || "Your name"}
                                    </span>
                                    <button
                                        onClick={() => setIsEditingUsername(true)}
                                        className="opacity-60 hover:opacity-100 transition-opacity"
                                        style={{ color: "var(--fg)" }}
                                        title="Edit username"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                        {client?.handle && (
                            <div className="mt-1">
                                <span className="text-sm opacity-70 font-medium" style={{ color: "var(--fg)" }}>
                                    {client.handle.startsWith('@') ? client.handle : `@${client.handle}`}
                                </span>
                            </div>
                        )}
                    </div>

                        <div className="w-full flex justify-center min-h-[3rem] px-4">
                        <textarea
                            value={currentBio}
                            onChange={(e) => setEditedClient({ ...editedClient, bio: e.target.value })}
                            className="w-full max-w-prose bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-xs text-center"
                            rows={2}
                            style={{ color: "var(--fg)" }}
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                        {loc && (
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs min-h-[2rem] px-4">
                            <span
                                className="rounded-full px-3 py-1 border"
                                style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
                            >
                                {loc}
                            </span>
                        </div>
                    )}

                        <div className="w-full mt-4 space-y-4 flex-1 min-h-0 overflow-y-auto px-4">
                        <div className="rounded-xl p-4 border backdrop-blur-sm w-full"
                            style={{
                                background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            <h3 className="text-sm font-semibold mb-4 text-center" style={{ color: "var(--fg)" }}>
                                Base Filters
                            </h3>
                            
                            <div className="flex flex-col items-center justify-center space-y-6 w-full">
                                <div className="w-full max-w-lg">
                                    <Label className="text-sm font-medium mb-3 block text-center w-full" style={{ color: "var(--fg)" }}>
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2px] w-full max-w-6xl">
                                    <div className="w-full flex flex-col items-center">
                                        <Label className="text-xs font-medium mb-3 block text-center w-full max-w-[110px]" style={{ color: "var(--fg)" }}>
                                            City
                                        </Label>
                                        <div className="w-[110px]">
                                            <Select
                                                value={currentLocation}
                                                onValueChange={(v) => setEditedClient({ ...editedClient, location: v })}
                                            >
                                                <SelectTrigger 
                                                    className="h-11 bg-elevated border-app text-xs rounded-lg focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 [&>[data-slot='select-icon']]:absolute [&>[data-slot='select-icon']]:right-0.5 [&>[data-slot='select-icon']]:top-1/2 [&>[data-slot='select-icon']]:-translate-y-1/2 [&>[data-slot='select-icon']]:!size-3 [&>[data-slot='select-icon']]:z-10 !gap-0 w-[110px] px-2 overflow-hidden" 
                                                    style={{ 
                                                        display: "flex", 
                                                        alignItems: "center", 
                                                        position: "relative",
                                                        padding: "0.5rem",
                                                        width: "110px",
                                                        overflow: "hidden"
                                                    }}
                                                >
                                                    <SelectValue 
                                                        placeholder="Select city" 
                                                        className="!flex !items-center !justify-center !text-center !m-0 !px-0 !w-full !whitespace-nowrap !text-xs !overflow-hidden !text-ellipsis"
                                                        style={{ 
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            margin: 0,
                                                            padding: 0,
                                                            paddingLeft: "0.5rem",
                                                            paddingRight: "0",
                                                            width: "100%",
                                                            fontSize: "12px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[110px] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start" style={{ width: "110px", minWidth: "110px", maxWidth: "110px" }}>
                                                    {cities.map((city) => (
                                                        <SelectItem key={city} value={city} className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>{city}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col items-center">
                                        <Label className="text-xs font-medium mb-3 block text-center w-full max-w-[110px]" style={{ color: "var(--fg)" }}>
                                            Piece Type
                                        </Label>
                                        <div className="w-[110px]">
                                            <Select
                                                value={currentPieceType || "none"}
                                                onValueChange={(v) => setEditedClient({ ...editedClient, pieceType: v })}
                                            >
                                                <SelectTrigger 
                                                    className="h-11 bg-elevated border-app text-xs rounded-lg focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 [&>[data-slot='select-icon']]:absolute [&>[data-slot='select-icon']]:right-0.5 [&>[data-slot='select-icon']]:top-1/2 [&>[data-slot='select-icon']]:-translate-y-1/2 [&>[data-slot='select-icon']]:!size-3 [&>[data-slot='select-icon']]:z-10 !gap-0 w-[110px] px-2 overflow-hidden" 
                                                    style={{ 
                                                        display: "flex", 
                                                        alignItems: "center", 
                                                        position: "relative",
                                                        padding: "0.5rem",
                                                        width: "110px",
                                                        overflow: "hidden"
                                                    }}
                                                >
                                                    <SelectValue 
                                                        placeholder="No preference" 
                                                        className="!flex !items-center !justify-center !text-center !m-0 !px-0 !w-full !whitespace-nowrap !text-xs !overflow-hidden !text-ellipsis"
                                                        style={{ 
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            margin: 0,
                                                            padding: 0,
                                                            paddingLeft: "0.5rem",
                                                            paddingRight: "0",
                                                            width: "100%",
                                                            fontSize: "12px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[110px] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start" style={{ width: "110px", minWidth: "110px", maxWidth: "110px" }}>
                                                    <SelectItem value="none" className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>No preference</SelectItem>
                                                    {PIECE_TYPE_OPTIONS.map((p) => (
                                                        <SelectItem key={p} value={p} className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>{p}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col items-center">
                                        <Label className="text-xs font-medium mb-3 block text-center w-full max-w-[110px]" style={{ color: "var(--fg)" }}>
                                            Placement
                                        </Label>
                                        <div className="w-[110px]">
                                            <Select
                                                value={currentPlacement || "none"}
                                                onValueChange={(v) => setEditedClient({ ...editedClient, placement: v })}
                                            >
                                                <SelectTrigger 
                                                    className="h-11 bg-elevated border-app text-xs rounded-lg focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 [&>[data-slot='select-icon']]:absolute [&>[data-slot='select-icon']]:right-0.5 [&>[data-slot='select-icon']]:top-1/2 [&>[data-slot='select-icon']]:-translate-y-1/2 [&>[data-slot='select-icon']]:!size-3 [&>[data-slot='select-icon']]:z-10 !gap-0 w-[110px] px-2 overflow-hidden" 
                                                    style={{ 
                                                        display: "flex", 
                                                        alignItems: "center", 
                                                        position: "relative",
                                                        padding: "0.5rem",
                                                        width: "110px",
                                                        overflow: "hidden"
                                                    }}
                                                >
                                                    <SelectValue 
                                                        placeholder="No preference" 
                                                        className="!flex !items-center !justify-center !text-center !m-0 !px-0 !w-full !whitespace-nowrap !text-xs !overflow-hidden !text-ellipsis"
                                                        style={{ 
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            margin: 0,
                                                            padding: 0,
                                                            paddingLeft: "0.5rem",
                                                            paddingRight: "0",
                                                            width: "100%",
                                                            fontSize: "12px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[110px] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start" style={{ width: "110px", minWidth: "110px", maxWidth: "110px" }}>
                                                    <SelectItem value="none" className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>No preference</SelectItem>
                                                    {PLACEMENT_OPTIONS.map((p) => (
                                                        <SelectItem key={p} value={p} className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>{p}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col items-center">
                                        <Label className="text-xs font-medium mb-3 block text-center w-full max-w-[110px]" style={{ color: "var(--fg)" }}>
                                            Size
                                        </Label>
                                        <div className="w-[110px]">
                                            <Select
                                                value={currentSize || "none"}
                                                onValueChange={(v) => setEditedClient({ ...editedClient, size: v })}
                                            >
                                                <SelectTrigger 
                                                    className="h-11 bg-elevated border-app text-xs rounded-lg focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 [&>[data-slot='select-icon']]:absolute [&>[data-slot='select-icon']]:right-0.5 [&>[data-slot='select-icon']]:top-1/2 [&>[data-slot='select-icon']]:-translate-y-1/2 [&>[data-slot='select-icon']]:!size-3 [&>[data-slot='select-icon']]:z-10 !gap-0 w-[110px] px-2 overflow-hidden" 
                                                    style={{ 
                                                        display: "flex", 
                                                        alignItems: "center", 
                                                        position: "relative",
                                                        padding: "0.5rem",
                                                        width: "110px",
                                                        overflow: "hidden"
                                                    }}
                                                >
                                                    <SelectValue 
                                                        placeholder="No preference" 
                                                        className="!flex !items-center !justify-center !text-center !m-0 !px-0 !w-full !whitespace-nowrap !text-xs !overflow-hidden !text-ellipsis"
                                                        style={{ 
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            margin: 0,
                                                            padding: 0,
                                                            paddingLeft: "0.5rem",
                                                            paddingRight: "0",
                                                            width: "100%",
                                                            fontSize: "12px",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis"
                                                        }}
                                                    />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card text-app rounded-xl focus:outline-none ring-0 outline-none w-[110px] max-h-64 overflow-y-auto" position="popper" side="bottom" align="start" style={{ width: "110px", minWidth: "110px", maxWidth: "110px" }}>
                                                    <SelectItem value="none" className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>No preference</SelectItem>
                                                    {SIZE_OPTIONS.map((s) => (
                                                        <SelectItem key={s.value} value={s.value} className="!px-2 !py-2 !pr-6 justify-center text-center items-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0 text-xs" style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingRight: "1.5rem" }}>{s.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl p-4 border backdrop-blur-sm w-full"
                            style={{
                                background: "color-mix(in oklab, var(--card) 80%, transparent)",
                                borderColor: "var(--border)"
                            }}>
                            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--fg)" }}>
                                Message to Artists
                            </h3>
                            <textarea
                                ref={messageTextareaRef}
                                value={currentMessage}
                                onChange={(e) => {
                                    setEditedClient({ ...editedClient, messageToArtists: e.target.value });
                                    const textarea = e.target;
                                    textarea.style.height = 'auto';
                                    const scrollHeight = textarea.scrollHeight;
                                    const minHeight = 100;
                                    textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
                                }}
                                className="w-full bg-[color:var(--elevated)]/50 backdrop-blur-sm border border-[color:var(--border)] rounded-md px-3 py-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none overflow-hidden text-xs min-h-[100px] text-center"
                                style={{ color: "var(--fg)", textAlign: "center" }}
                                placeholder="Hi! I'm interested in getting a tattoo. I've attached some reference images that show the style and vibe I'm going for. My budget is around $100-$200. I'm located in New York, NY. I don't have a placement in mind. I'm still figuring out the size. Let me know if you're available and interested!"
                            />
                            
                            <div className="flex items-center justify-between mt-4 mb-3">
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
                                        className="relative aspect-square rounded-xl border overflow-hidden"
                                        style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                                        onMouseEnter={(e) => {
                                            const overlay = e.currentTarget.querySelector('.image-overlay') as HTMLElement;
                                            if (overlay) overlay.style.opacity = '1';
                                        }}
                                        onMouseLeave={(e) => {
                                            const overlay = e.currentTarget.querySelector('.image-overlay') as HTMLElement;
                                            if (overlay) overlay.style.opacity = '0';
                                        }}
                                    >
                                        <img
                                            src={url}
                                            alt={`Reference ${index + 1}`}
                                            className="h-full w-full object-cover pointer-events-none"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div className="image-overlay absolute inset-0 bg-black/60 transition-opacity duration-200 flex items-center justify-center gap-2" style={{ opacity: 0 }}>
                                            <button
                                                onClick={() => {
                                                    setReplacingIndex(index);
                                                    referenceInputRef.current?.click();
                                                }}
                                                disabled={uploading}
                                                className="bg-blue-500/80 hover:bg-blue-500 rounded-full p-2 transition-colors"
                                                title="Replace image"
                                            >
                                                <Camera className="h-4 w-4 text-white" />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveReference(index)}
                                                className="bg-red-500/80 hover:bg-red-500 rounded-full p-2 transition-colors"
                                                title="Delete image"
                                            >
                                                <Trash2 className="h-4 w-4 text-white" />
                                            </button>
                                        </div>
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
                                <div className="text-xs text-center mt-3" style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}>
                                    No reference images added
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-4 mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                            <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-lg border" style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 50%, transparent)", width: "100%" }}>
                                <Label htmlFor="visible" className="text-sm font-medium cursor-pointer" style={{ color: "var(--fg)" }}>
                                    Visible to others
                                </Label>
                                <Switch
                                    id="visible"
                                    checked={editedClient.visible !== undefined ? editedClient.visible : (client?.visible !== undefined ? client.visible : true)}
                                    onCheckedChange={(checked) => setEditedClient({ ...editedClient, visible: checked })}
                                    disabled={saving}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    onClick={() => {
                                        setEditedClient({});
                                    }}
                                    disabled={!hasChanges}
                                    size="sm"
                                    variant="outline"
                                    className="border-[color:var(--border)] hover:bg-[color:var(--elevated)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveProfile}
                                    disabled={!hasChanges || saving || uploading}
                                    size="sm"
                                    style={{ background: "var(--fg)", color: "var(--bg)" }}
                                    className="hover:opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
                <div className="w-full h-full flex flex-col rounded-3xl transition relative p-6 lg:p-8 overflow-hidden" style={{ background: "var(--card)" }}>
                    <ClientAppointmentHistory />
                </div>
            </div>
        </div>
    );
}