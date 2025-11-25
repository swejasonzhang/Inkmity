import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { API_URL } from "@/lib/http";
import { Save, Camera, X, User, MapPin, DollarSign, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface Client {
    _id: string;
    username: string;
    bio?: string;
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
    placement?: string;
    size?: string;
    references?: string[];
    avatar?: { url?: string; publicId?: string };
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
];

const SIZE_OPTIONS = [
    { value: "tiny", label: "Tiny (≤ 2 in)" },
    { value: "small", label: "Small (2–4 in)" },
    { value: "medium", label: "Medium (4–6 in)" },
    { value: "large", label: "Large (6–10 in)" },
    { value: "xl", label: "XL (10–14 in)" },
    { value: "xxl", label: "XXL (≥ 14 in)" },
];

const MIN_BUDGET = 100;
const MAX_BUDGET = 5000;
const STEP = 50;
const MIN_GAP = 100;

export default function ClientProfile() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [saving, setSaving] = useState(false);
    const [client, setClient] = useState<Client | null>(null);
    const [editedClient, setEditedClient] = useState<Partial<Client>>({});
    const [uploading, setUploading] = useState(false);
    const [cities, setCities] = useState<string[]>([]);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);

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

    const loadProfile = useCallback(async () => {
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
                budgetMin: data.budgetMin || 100,
                budgetMax: data.budgetMax || 200,
                placement: data.placement || "",
                size: data.size || "",
                references: Array.isArray(data.references) ? data.references : [],
                avatar: data.avatar,
            };
            setClient(clientData);
            setEditedClient({});
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    }, [getToken]);

    useEffect(() => {
        const load = async () => {
            await loadProfile();
        };
        load();
    }, [loadProfile]);

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

    const saveProfile = useCallback(async () => {
        if (!user || Object.keys(editedClient).length === 0) return;
        try {
            setSaving(true);
            const token = await getToken();
            const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
            const username = editedClient.username || client?.username || user.firstName || email.split("@")[0] || "user";

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
                        location: editedClient.location ?? client?.location,
                        budgetMin: editedClient.budgetMin ?? client?.budgetMin,
                        budgetMax: editedClient.budgetMax ?? client?.budgetMax,
                        placement: editedClient.placement ?? client?.placement,
                        size: editedClient.size ?? client?.size,
                        referenceImages: editedClient.references ?? client?.references,
                    },
                    bio: editedClient.bio ?? client?.bio,
                }),
            });
            if (!response.ok) throw new Error("Failed to save profile");

            await loadProfile();
            setEditedClient({});
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    }, [user, client, editedClient, getToken, loadProfile]);

    const handleImageUpload = async (file: File, type: "avatar" | "reference") => {
        try {
            setUploading(true);
            const token = await getToken();

            const sigResponse = await fetch(
                type === "avatar"
                    ? `${API_URL}/users/avatar/signature`
                    : `${API_URL}/images/sign?kind=client_reference`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            if (!sigResponse.ok) throw new Error("Failed to get signature");

            const sigData = await sigResponse.json();
            const uploaded = await uploadToCloudinary(file, sigData);
            if (!uploaded?.secure_url) throw new Error("Upload failed");

            if (type === "avatar") {
                const updateResponse = await fetch(`${API_URL}/users/me/avatar`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        url: uploaded.secure_url,
                        publicId: uploaded.public_id,
                        alt: file.name,
                        width: uploaded.width,
                        height: uploaded.height,
                    }),
                });
                if (!updateResponse.ok) throw new Error("Failed to update avatar");
                setEditedClient(prev => ({ ...prev, avatar: { url: uploaded.secure_url, publicId: uploaded.public_id } }));
            } else {
                const currentRefs = editedClient.references ?? client?.references ?? [];
                const newRefs = [...currentRefs, uploaded.secure_url].slice(0, 3);
                setEditedClient(prev => ({ ...prev, references: newRefs }));
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveReference = (index: number) => {
        const currentRefs = editedClient.references ?? client?.references ?? [];
        const newRefs = currentRefs.filter((_, i) => i !== index);
        setEditedClient(prev => ({ ...prev, references: newRefs }));
    };


    const profileImageUrl = editedClient.avatar?.url || client?.avatar?.url || "";
    const username = editedClient.username ?? client?.username ?? "";
    const bio = editedClient.bio ?? client?.bio ?? "";
    const location = editedClient.location ?? client?.location ?? "";
    const budgetMin = editedClient.budgetMin ?? client?.budgetMin ?? 100;
    const budgetMax = editedClient.budgetMax ?? client?.budgetMax ?? 200;
    const placement = editedClient.placement ?? client?.placement ?? "";
    const size = editedClient.size ?? client?.size ?? "";
    const references = editedClient.references ?? client?.references ?? [];

    const initials = (username || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join("");

    const hasChanges = Object.keys(editedClient).length > 0;

    const handleBudgetChange = (vals: number[]) => {
        let [l, h] = vals;
        l = Math.round(l / STEP) * STEP;
        h = Math.round(h / STEP) * STEP;
        if (h - l < MIN_GAP) {
            if (l !== budgetMin) l = Math.max(MIN_BUDGET, h - MIN_GAP);
            if (h !== budgetMax) h = Math.min(MAX_BUDGET, l + MIN_GAP);
        }
        setEditedClient(prev => ({ ...prev, budgetMin: l, budgetMax: h }));
    };

    return (
        <div className="w-full max-w-2xl mx-auto border-2 rounded-xl p-4 sm:p-6 h-full sm:h-auto overflow-y-hidden sm:overflow-visible" style={{ borderColor: "var(--fg)", maxHeight: "100%", minHeight: 0 }}>
            <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "avatar")}
            />
            <input
                ref={referenceInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => handleImageUpload(file, "reference"));
                }}
            />

            <div className="space-y-6 sm:space-y-8 overflow-y-hidden sm:overflow-visible" style={{ maxHeight: "100%", minHeight: 0 }}>
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
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="relative rounded-full overflow-hidden w-24 h-24 sm:w-32 sm:h-32 border-2 border-[color:var(--border)]" style={{ background: "var(--elevated)" }}>
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
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
                                    className="absolute bottom-0 right-0 p-2 rounded-full border-2 border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--elevated)] transition-colors"
                                    style={{ color: "var(--fg)" }}
                                    title="Change profile picture"
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="w-full max-w-md">
                                <Label htmlFor="username" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                    Display Name
                                </Label>
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setEditedClient({ ...editedClient, username: e.target.value })}
                                    className="bg-[color:var(--elevated)] border-[color:var(--border)] focus:border-[color:var(--fg)] text-center"
                                    placeholder="Your name"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <User className="h-5 w-5" />
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
                                    onChange={(e) => setEditedClient({ ...editedClient, bio: e.target.value })}
                                    className="w-full max-w-md mx-auto block bg-[color:var(--elevated)] border border-[color:var(--border)] rounded-md p-3 focus:outline-none focus:border-[color:var(--fg)] focus:ring-2 focus:ring-[color:var(--fg)]/20 resize-none text-center"
                                    rows={4}
                                    style={{ color: "var(--fg)" }}
                                    placeholder="Tell artists about yourself and what you're looking for..."
                                />
                            </div>
                            <div className="flex flex-col items-center">
                                <Label htmlFor="location" className="text-sm font-medium mb-2 text-center flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                                    <MapPin className="h-4 w-4" />
                                    Location
                                </Label>
                                <Select value={location || ""} onValueChange={(v) => setEditedClient({ ...editedClient, location: v })}>
                                    <SelectTrigger className="h-10 sm:h-14 bg-[color:var(--elevated)] border-[color:var(--border)] text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full sm:w-[260px]">
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent 
                                        side="bottom" 
                                        align="center" 
                                        sideOffset={4}
                                        className="bg-[color:var(--card)] text-[color:var(--fg)] rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in"
                                        position="popper"
                                    >
                                        {(cities.length > 0 ? cities : fallbackCities).map((city) => (
                                            <SelectItem 
                                                key={city} 
                                                value={city}
                                                className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0"
                                            >
                                                {city}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <DollarSign className="h-5 w-5" />
                            Budget & Preferences
                        </h2>
                        <div className="space-y-6">
                            <div className="max-w-md mx-auto">
                                <Label className="text-sm font-medium mb-4 block text-center" style={{ color: "var(--fg)" }}>
                                    Budget Range: ${budgetMin} - ${budgetMax}
                                </Label>
                                <div className="px-2">
                                    <Slider
                                        min={MIN_BUDGET}
                                        max={MAX_BUDGET}
                                        step={STEP}
                                        value={[budgetMin, budgetMax]}
                                        onValueChange={handleBudgetChange}
                                        minStepsBetweenThumbs={Math.ceil(MIN_GAP / STEP)}
                                    />
                                </div>
                                <div className="flex justify-between text-xs mt-2" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                    <span>${MIN_BUDGET}</span>
                                    <span>${MAX_BUDGET}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                <div className="flex flex-col items-center">
                                    <Label htmlFor="placement" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                        Preferred Placement
                                    </Label>
                                    <Select value={placement} onValueChange={(v) => setEditedClient({ ...editedClient, placement: v })}>
                                        <SelectTrigger className="h-10 sm:h-14 bg-[color:var(--elevated)] border-[color:var(--border)] text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full sm:w-[260px]">
                                            <SelectValue placeholder="Select placement" />
                                        </SelectTrigger>
                                        <SelectContent 
                                            side="bottom" 
                                            align="center" 
                                            sideOffset={4}
                                            className="bg-[color:var(--card)] text-[color:var(--fg)] rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in"
                                            position="popper"
                                        >
                                            {PLACEMENT_OPTIONS.map((p) => (
                                                <SelectItem 
                                                    key={p} 
                                                    value={p}
                                                    className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0"
                                                >
                                                    {p}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Label htmlFor="size" className="text-sm font-medium mb-2 block text-center" style={{ color: "var(--fg)" }}>
                                        Preferred Size
                                    </Label>
                                    <Select value={size} onValueChange={(v) => setEditedClient({ ...editedClient, size: v })}>
                                        <SelectTrigger className="h-10 sm:h-14 bg-[color:var(--elevated)] border-[color:var(--border)] text-xs sm:text-sm rounded-lg text-center justify-center focus:ring-0 focus:outline-none ring-0 ring-offset-0 focus-visible:ring-0 w-full sm:w-[260px]">
                                            <SelectValue placeholder="Select size" />
                                        </SelectTrigger>
                                        <SelectContent 
                                            side="bottom" 
                                            align="center" 
                                            sideOffset={4}
                                            className="bg-[color:var(--card)] text-[color:var(--fg)] rounded-xl focus:outline-none ring-0 outline-none w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto data-[state=open]:animate-in"
                                            position="popper"
                                        >
                                            {SIZE_OPTIONS.map((s) => (
                                                <SelectItem 
                                                    key={s.value} 
                                                    value={s.value}
                                                    className="justify-center text-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 ring-0"
                                                >
                                                    {s.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
                        <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center justify-center gap-2" style={{ color: "var(--fg)" }}>
                            <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            Reference Images
                            <span className="text-xs sm:text-sm font-normal" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                (up to 3)
                            </span>
                        </h2>
                        <div className="flex sm:grid sm:grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto overflow-x-auto sm:overflow-visible justify-center items-center pr-2 sm:pr-0" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                            {references.map((src, i) => (
                                <div key={i} className="relative aspect-square flex-shrink-0 w-32 sm:w-full group">
                                    <div className="absolute inset-0 rounded-lg overflow-hidden border border-[color:var(--border)]">
                                        <img
                                            src={src}
                                            alt={`Reference ${i + 1}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveReference(i)}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {references.length < 3 && (
                                <button
                                    onClick={() => referenceInputRef.current?.click()}
                                    disabled={uploading}
                                    className="aspect-square flex-shrink-0 w-32 sm:w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-[color:var(--elevated)] transition-colors disabled:opacity-50"
                                    style={{ borderColor: "var(--border)", color: "var(--fg)" }}
                                >
                                    <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                                    <span className="text-xs">Add Image</span>
                                </button>
                            )}
                        </div>
                        {references.length === 0 && (
                            <p className="text-sm text-center py-4" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                                No reference images yet. Add images to help artists understand your style preferences.
                            </p>
                        )}
                    </div>
                </div>

                {hasChanges && (
                    <div className="sticky bottom-4 flex justify-center sm:justify-end">
                        <Button
                            onClick={saveProfile}
                            disabled={saving || uploading}
                            size="lg"
                            style={{ background: "var(--fg)", color: "var(--bg)" }}
                            className="hover:opacity-90 shadow-lg w-full sm:w-auto"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? "Saving..." : "Save All Changes"}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
