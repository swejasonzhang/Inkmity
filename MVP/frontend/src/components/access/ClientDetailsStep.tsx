import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type ClientProfile = {
    budgetMin: string;
    budgetMax: string;
    location: string;
    placement: string;
    size: string;
    notes: string;
    style?: string;
    availability?: string;
};

const PRESET_STORAGE_KEY = "inkmity_artist_filters";
const CITY_JSON_URL = "/us-cities.min.json";

const STYLE_OPTIONS = [
    "All Styles",
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

const AVAILABILITY_OPTIONS = [
    { value: "all", label: "No preference" },
    { value: "7d", label: "Next week" },
    { value: "lt1m", label: "Under 1 month" },
    { value: "1to3m", label: "1–3 months" },
    { value: "lte6m", label: "Up to 6 months" },
    { value: "waitlist", label: "Waitlist / Closed" },
];

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

export default function ClientDetailsStep({
    client,
    onChange,
}: {
    client: ClientProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const [openCity, setOpenCity] = useState(false);
    const [prefStyle, setPrefStyle] = useState<string>(client.style ?? "all");
    const [prefAvail, setPrefAvail] = useState<string>(client.availability ?? "all");
    const [cities, setCities] = useState<string[]>([]);

    const MIN = 100;
    const MAX = 5000;
    const STEP = 50;
    const MIN_GAP = 100;

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    const snap = (v: number) => Math.round(v / STEP) * STEP;
    const emit = (name: string, value: number | string) =>
        onChange({ target: { name, value: String(value) } } as unknown as React.ChangeEvent<HTMLInputElement>);

    const toNum = (val: unknown, fallback: number) => {
        const n = typeof val === "string" ? Number(val) : Number(val);
        return Number.isFinite(n) ? n : fallback;
    };

    const rawLow = toNum(client.budgetMin, MIN);
    const rawHigh = toNum(client.budgetMax, 1000);

    const low = clamp(snap(rawLow), MIN, MAX - MIN_GAP);
    const high = clamp(snap(rawHigh), low + MIN_GAP, MAX);

    const priceBucketFromRange = (lo: number, hi: number) => {
        if (lo <= MIN && hi >= MAX) return "all";
        if (hi <= 500) return "100-500";
        if (hi <= 1000) return "500-1000";
        if (hi <= 2000) return "1000-2000";
        if (hi <= 5000) return "2000-5000";
        return "5000+";
    };

    const savePreset = (opts?: Partial<{ low: number; high: number; location: string; style: string; avail: string }>) => {
        const l = snap(clamp(opts?.low ?? low, MIN, MAX));
        const h = snap(clamp(opts?.high ?? high, MIN, MAX));
        const loc = opts?.location ?? client.location ?? "";
        const style = opts?.style ?? prefStyle ?? "all";
        const avail = opts?.avail ?? prefAvail ?? "all";
        const bucket = priceBucketFromRange(l, h);
        const preset: Record<string, string> = {};
        if (bucket !== "all") preset.priceFilter = bucket;
        if (loc && loc !== "all") preset.locationFilter = loc;
        if (style && style !== "all" && style !== "All Styles") preset.styleFilter = style;
        if (avail && avail !== "all") preset.availabilityFilter = avail;
        if (Object.keys(preset).length === 0) {
            if (typeof window !== "undefined") localStorage.removeItem(PRESET_STORAGE_KEY);
            return;
        }
        if (typeof window !== "undefined") {
            localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
        }
    };

    const handleSliderChange = (vals: number[]) => {
        let [l, h] = vals;
        l = snap(clamp(l, MIN, MAX));
        h = snap(clamp(h, MIN, MAX));
        if (h - l < MIN_GAP) {
            if (l !== low) l = clamp(h - MIN_GAP, MIN, MAX - MIN_GAP);
            if (h !== high) h = clamp(l + MIN_GAP, MIN + MIN_GAP, MAX);
            l = snap(l);
            h = snap(h);
        }
        emit("budgetMin", l);
        emit("budgetMax", h);
        savePreset({ low: l, high: h });
    };

    const percent = (val: number) => ((val - MIN) / (MAX - MIN)) * 100;
    const leftPct = percent(low);
    const rightPct = 100 - percent(high);

    const fallbackCities = useMemo(
        () => [
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
        ],
        []
    );

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
    }, [fallbackCities]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem(PRESET_STORAGE_KEY);
            if (!raw) return;
            const p = JSON.parse(raw) as Partial<{
                priceFilter: string;
                locationFilter: string;
                styleFilter: string;
                availabilityFilter: string;
            }>;
            if (p.styleFilter) {
                setPrefStyle(p.styleFilter);
                emit("style", p.styleFilter);
            }
            if (p.availabilityFilter) {
                setPrefAvail(p.availabilityFilter);
                emit("availability", p.availabilityFilter);
            }
        } catch { }
    }, []);

    return (
        <div className="grid gap-5">
            <div className="text-left">
                <label className="mb-2 block text-sm text-white/70">Estimated budget (USD)</label>
                <div className="relative pb-4 pt-5">
                    <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
                    <div className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/40" style={{ left: `${leftPct}%`, right: `${rightPct}%` }} />
                    <Slider
                        min={MIN}
                        max={MAX}
                        step={STEP}
                        value={[low, high]}
                        onValueChange={handleSliderChange}
                        minStepsBetweenThumbs={Math.ceil(MIN_GAP / STEP)}
                        className="relative z-10"
                        aria-label="Budget range"
                    />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                    <span>${MIN.toLocaleString()}</span>
                    <span>${low.toLocaleString()} – ${high.toLocaleString()}</span>
                    <span>${MAX.toLocaleString()}+</span>
                </div>
                <p className="mt-2 text-xs text-white/45">Most preferences can be edited later in <span className="underline">Dashboard → Filters</span>. Some core profile settings may be restricted from frequent changes.</p>
            </div>

            <div className="text-left">
                <div className="flex items-center gap-3">
                    <label className="text-sm text-white/70">Your city</label>
                    <Select
                        open={openCity}
                        onOpenChange={setOpenCity}
                        value={client.location || ""}
                        onValueChange={(val) => {
                            emit("location", val);
                            savePreset({ location: val });
                        }}
                    >
                        <SelectTrigger className="h-11 w-72 rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="Choose a city" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" align="start" sideOffset={6} avoidCollisions={false} className="max-h-72 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white">
                            {cities.map((c) => (
                                <SelectItem key={c} value={c} className="text-white">
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="mt-2 text-xs text-white/45">You can update your city later in <span className="underline">Settings → Profile</span>.</p>
            </div>

            <div className="text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm text-white/70">Preferred style (optional)</label>
                    <Select
                        value={prefStyle}
                        onValueChange={(v) => {
                            setPrefStyle(v);
                            emit("style", v);
                            savePreset({ style: v });
                        }}
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="No preference" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-72 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white">
                            <SelectItem value="all">No preference</SelectItem>
                            {STYLE_OPTIONS.slice(1).map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="mb-1 block text-sm text-white/70">Availability (optional)</label>
                    <Select
                        value={prefAvail}
                        onValueChange={(v) => {
                            setPrefAvail(v);
                            emit("availability", v);
                            savePreset({ avail: v });
                        }}
                    >
                        <SelectTrigger className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="No preference" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 bg-[#0b0b0b] text-white">
                            {AVAILABILITY_OPTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                    {a.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="text-left grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-sm text-white/70">Placement (optional)</label>
                    <Select value={client.placement || ""} onValueChange={(v) => emit("placement", v)}>
                        <SelectTrigger className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="Select placement" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-72 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white">
                            {PLACEMENT_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="mb-1 block text-sm text-white/70">Approximate size (optional)</label>
                    <Select value={client.size || ""} onValueChange={(v) => emit("size", v)}>
                        <SelectTrigger className="h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-72 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white">
                            {SIZE_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}