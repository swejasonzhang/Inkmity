import { useState, useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type ClientProfile = {
    budgetMin: string;
    budgetMax: string;
    location: string;
    placement: string;
    size: string;
    notes: string;
};

export default function ClientDetailsStep({
    client,
    onChange,
}: {
    client: ClientProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const [openCity, setOpenCity] = useState(false);

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
    };

    const percent = (val: number) => ((val - MIN) / (MAX - MIN)) * 100;
    const leftPct = percent(low);
    const rightPct = 100 - percent(high);

    const cities = useMemo(
        () => [
            "New York",
            "Los Angeles",
            "Chicago",
            "San Francisco",
            "Miami",
            "London",
            "Paris",
            "Berlin",
            "Tokyo",
            "Seoul",
            "Sydney",
            "Toronto",
            "Vancouver",
            "Mexico City",
            "São Paulo",
            "Buenos Aires",
            "Johannesburg",
            "Dubai",
            "Singapore",
            "Hong Kong",
        ],
        []
    );

    return (
        <div className="grid gap-5">
            <div className="text-left">
                <label className="mb-2 block text-sm text-white/70">Estimated budget (USD)</label>

                <div className="relative pb-4 pt-5">
                    <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10" />
                    <div
                        className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/40"
                        style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
                    />

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

                <p className="mt-2 text-xs text-white/45">
                    Most preferences can be edited later in <span className="underline">Dashboard → Filters</span>. Some core profile settings may be restricted from frequent changes.
                </p>
            </div>

            <div className="text-left">
                <div className="flex items-center gap-3">
                    <label className="text-sm text-white/70">Your city / region</label>
                    <Select
                        open={openCity}
                        onOpenChange={setOpenCity}
                        value={client.location || ""}
                        onValueChange={(val) => emit("location", val)}
                    >
                        <SelectTrigger className="h-11 w-64 rounded-xl border border-white/10 bg-white/10 px-4 text-white">
                            <SelectValue placeholder="Choose a city" />
                        </SelectTrigger>
                        <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            avoidCollisions={false}
                            className="max-h-64 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white"
                        >
                            {cities.map((c) => (
                                <SelectItem key={c} value={c} className="text-white">
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="mt-2 text-xs text-white/45">
                    You can update your city later in <span className="underline">Settings → Profile</span>.
                </p>
            </div>

            <div className="text-left">
                <label className="mb-1 block text-sm text-white/70" htmlFor="placement">
                    Placement (e.g., forearm) <span className="text-white/40">(Optional)</span>
                </label>
                <input
                    id="placement"
                    type="text"
                    name="placement"
                    value={client.placement}
                    placeholder="Placement (e.g., forearm)"
                    onChange={(e) => emit("placement", e.target.value)}
                    className="h-11 w-full rounded-xl bg-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>

            <div className="text-left">
                <label className="mb-1 block text-sm text-white/70" htmlFor="size">
                    Approximate size (e.g., 4in) <span className="text-white/40">(Optional)</span>
                </label>
                <input
                    id="size"
                    type="text"
                    name="size"
                    value={client.size}
                    placeholder="Approximate size (e.g., 4in)"
                    onChange={(e) => emit("size", e.target.value)}
                    className="h-11 w-full rounded-xl bg-white/10 px-4 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>
        </div>
    );
}