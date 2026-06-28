import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MapPin, DollarSign, Brush, Clock, Crosshair, Ruler, Cake, ChevronDown } from "lucide-react";

const parseLocalDate = (s?: string): Date | undefined => {
    if (!s) return undefined;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
};
const formatYMD = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatDob = (s?: string): string => {
    const d = parseLocalDate(s);
    return d ? d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "";
};

type ClientProfile = {
    budgetMin: string;
    budgetMax: string;
    location: string;
    placement: string;
    size: string;
    style?: string;
    availability?: string;
    dob?: string;
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
    const [dobOpen, setDobOpen] = useState(false);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seed prefs from storage once on mount; emit wraps onChange and re-running would re-emit stale prefs
    }, []);

    const fieldCls = "space-y-0.5 flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-2.5 py-0.5 transition hover:border-white/20";
    const labelCls = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold capitalize text-white/90 text-center";
    const triggerCls =
        "relative h-8 w-full rounded-xl border border-white/15 bg-neutral-900/70 pl-9 pr-9 text-xs text-white !justify-center transition-colors hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 " +
        "data-[placeholder]:text-white/45 " +
        "[&>svg]:absolute [&>svg]:right-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2 [&>svg]:text-white/70 [&>svg]:opacity-100 [&>svg]:transition-transform [&[data-state=open]>svg]:rotate-180 " +
        "[&_[data-slot=select-value]]:w-full [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:text-center [&_[data-slot=select-value]]:truncate";
    const contentCls =
        "w-[var(--radix-select-trigger-width)] rounded-xl max-h-72 overflow-y-auto border border-white/10 bg-neutral-900 p-1 text-white shadow-xl shadow-black/40 ring-1 ring-white/5 " +
        "[&_[data-slot=select-item]]:justify-center [&_[data-slot=select-item]]:text-center [&_[data-slot=select-item]]:rounded-lg [&_[data-slot=select-item]]:py-1.5 [&_[data-slot=select-item]]:pl-8 [&_[data-slot=select-item]]:truncate [&_[data-slot=select-item]]:text-xs [&_[data-slot=select-item]]:capitalize [&_[data-slot=select-item]]:text-white " +
        "[&_[data-slot=select-scroll-up-button]]:bg-neutral-900 [&_[data-slot=select-scroll-up-button]]:text-white/80 [&_[data-slot=select-scroll-up-button]]:border-white/10 " +
        "[&_[data-slot=select-scroll-down-button]]:bg-neutral-900 [&_[data-slot=select-scroll-down-button]]:text-white/80 [&_[data-slot=select-scroll-down-button]]:border-white/10";
    const sliderCls =
        "w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-neutral-900 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:ring-white/30";

    return (
        <div className="w-full space-y-1">
            <div className="grid grid-cols-2 gap-1">
                <div className={`${fieldCls} col-span-2`}>
                    <label className={labelCls}><DollarSign className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Budget range</label>
                    <div className="w-full max-w-md px-1 pt-1">
                        <Slider
                            min={MIN}
                            max={MAX}
                            step={STEP}
                            value={[low, high]}
                            onValueChange={handleSliderChange}
                            minStepsBetweenThumbs={Math.ceil(MIN_GAP / STEP)}
                            aria-label="Budget range"
                            className={sliderCls}
                        />
                        <div className="mt-1.5 flex items-center justify-center gap-2">
                            <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-0.5">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Min</span>
                                <span className="text-sm font-bold leading-none tabular-nums text-white">${low.toLocaleString()}</span>
                            </div>
                            <span className="text-white/30 text-xs">·</span>
                            <div className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-0.5">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Max</span>
                                <span className="text-sm font-bold leading-none tabular-nums text-white">${high.toLocaleString()}{high >= MAX ? "+" : ""}</span>
                            </div>
                            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-white/35">USD</span>
                        </div>
                    </div>
                </div>

                <div className={`${fieldCls} col-span-2`}>
                    <label className={labelCls}><MapPin className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />City</label>
                    <Select
                        open={openCity}
                        onOpenChange={setOpenCity}
                        value={client.location && client.location !== "" ? client.location : "New York, NY"}
                        onValueChange={(val) => {
                            emit("location", val);
                            savePreset({ location: val });
                        }}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Choose your city" className="text-center" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" align="center" sideOffset={6} avoidCollisions={false} className={contentCls}>
                            {cities.map((c) => (
                                <SelectItem key={c} value={c} className="text-center justify-center">{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Brush className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Style</label>
                    <Select
                        value={prefStyle}
                        onValueChange={(v) => {
                            setPrefStyle(v);
                            emit("style", v);
                            savePreset({ style: v });
                        }}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="No preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="center" side="bottom" className={contentCls}>
                            <SelectItem value="all" className="text-center justify-center">No preference</SelectItem>
                            {STYLE_OPTIONS.slice(1).map((s) => (
                                <SelectItem key={s} value={s} className="text-center justify-center">{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Clock className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Availability</label>
                    <Select
                        value={prefAvail}
                        onValueChange={(v) => {
                            setPrefAvail(v);
                            emit("availability", v);
                            savePreset({ avail: v });
                        }}
                    >
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="No preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="center" side="bottom" className={contentCls}>
                            {AVAILABILITY_OPTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value} className="text-center justify-center">{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Crosshair className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Placement</label>
                    <Select value={client.placement && client.placement !== "" ? client.placement : "all"} onValueChange={(v) => emit("placement", v)}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="No preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="center" side="bottom" className={contentCls}>
                            <SelectItem value="all" className="text-center justify-center">No preference</SelectItem>
                            {PLACEMENT_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p} className="text-center justify-center">{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Ruler className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Size</label>
                    <Select value={client.size && client.size !== "" ? client.size : "all"} onValueChange={(v) => emit("size", v)}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="No preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent position="popper" align="center" side="bottom" className={contentCls}>
                            <SelectItem value="all" className="text-center justify-center">No preference</SelectItem>
                            {SIZE_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value} className="text-center justify-center">{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className={`${fieldCls} col-span-2`}>
                    <label className={labelCls}><Cake className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Birthday</label>
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                aria-label="Select your birthday"
                                className="relative h-9 md:h-8 w-full rounded-xl border border-white/15 bg-neutral-900/70 px-9 text-xs text-white text-center transition hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                            >
                                <Cake className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
                                <span className={client.dob ? "text-white" : "text-white/45"}>
                                    {client.dob ? formatDob(client.dob) : "Select your birthday"}
                                </span>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="center" className="w-auto p-0 rounded-xl border-white/10 bg-neutral-900 text-white">
                            <Calendar
                                mode="single"
                                selected={parseLocalDate(client.dob)}
                                onSelect={(d) => {
                                    emit("dob", d ? formatYMD(d) : "");
                                    setDobOpen(false);
                                }}
                                captionLayout="dropdown"
                                startMonth={new Date(1920, 0)}
                                endMonth={new Date()}
                                defaultMonth={parseLocalDate(client.dob) ?? new Date(2000, 0)}
                                disabled={{ after: new Date() }}
                                autoFocus
                                className="p-3 w-[17.5rem]"
                                classNames={{
                                    month_caption: "flex items-center justify-center h-(--cell-size) px-8",
                                    nav: "absolute inset-x-0 top-0 flex items-center justify-between w-full",
                                }}
                            />
                        </PopoverContent>
                    </Popover>
                    <p className="text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">For your birthday credit · optional</p>
                </div>
            </div>
        </div>
    );
}