import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

    const MIN = 50;
    const MAX = 5000;
    const STEP = 50;
    const MIN_GAP = STEP * 2;

    const rawLow = Number(client.budgetMin || MIN);
    const rawHigh = Number(client.budgetMax || Math.max(MIN + MIN_GAP, 500));

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

    const low = clamp(rawLow, MIN, MAX - MIN_GAP);
    const high = clamp(rawHigh, low + MIN_GAP, MAX);

    const emit = (name: string, value: number | string) =>
        onChange({ target: { name, value: String(value) } } as unknown as React.ChangeEvent<HTMLInputElement>);

    const onLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = clamp(Number(e.target.value), MIN, high - MIN_GAP);
        emit("budgetMin", next);
    };

    const onHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = clamp(Number(e.target.value), low + MIN_GAP, MAX);
        emit("budgetMax", next);
    };

    const percent = (val: number) => ((val - MIN) / (MAX - MIN)) * 100;

    const cities = [
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
    ];

    return (
        <div className="grid gap-5">
            <div className="text-left">
                <label className="block text-sm text-white/70 mb-2" htmlFor="budgetLow">
                    Estimated budget (USD)
                </label>

                <div className="relative pt-5 pb-4 budget-range">
                    <input
                        id="budgetLow"
                        type="range"
                        min={MIN}
                        max={MAX}
                        step={STEP}
                        value={low}
                        onChange={onLowChange}
                        className="absolute top-1/2 -translate-y-1/2 h-8 appearance-none bg-transparent cursor-ew-resize z-20"
                        style={{
                            left: 0,
                            right: `${100 - percent(high)}%`,
                            opacity: 0,
                        }}
                    />

                    <input
                        id="budgetHigh"
                        type="range"
                        min={MIN}
                        max={MAX}
                        step={STEP}
                        value={high}
                        onChange={onHighChange}
                        className="absolute top-1/2 -translate-y-1/2 h-8 appearance-none bg-transparent cursor-ew-resize z-20"
                        style={{
                            left: `${percent(low)}%`,
                            right: 0,
                            opacity: 0,
                        }}
                    />

                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/10" />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/40"
                        style={{ left: `${percent(low)}%`, right: `${100 - percent(high)}%` }}
                    />

                    <div
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                        style={{ left: `calc(${percent(low)}% - 10px)` }}
                    >
                        <div className="h-5 w-5 rounded-full bg-white shadow" />
                    </div>
                    <div
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                        style={{ left: `calc(${percent(high)}% - 10px)` }}
                    >
                        <div className="h-5 w-5 rounded-full bg-white shadow" />
                    </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-white/60">
                    <span>${MIN.toLocaleString()}</span>
                    <span>
                        ${low.toLocaleString()} – ${high.toLocaleString()}
                    </span>
                    <span>${MAX.toLocaleString()}+</span>
                </div>

                <p className="text-xs text-white/45 mt-2">
                    Most preferences can be edited later in <span className="underline">Dashboard → Filters</span>. Some core
                    profile settings may be restricted from frequent changes.
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
                        <SelectTrigger className="h-11 rounded-xl bg-white/10 text-white border-white/10 px-4 w-64">
                            <SelectValue placeholder="Choose a city" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start" className="bg-[#0b0b0b] text-white border-white/10">
                            {cities.map((c) => (
                                <SelectItem key={c} value={c} className="text-white">
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-white/45 mt-2">
                    You can update your city later in <span className="underline">Settings → Profile</span>.
                </p>
            </div>

            <div className="text-left">
                <label className="block text-sm text-white/70 mb-1" htmlFor="placement">
                    Placement (e.g., forearm) <span className="text-white/40">(Optional)</span>
                </label>
                <input
                    id="placement"
                    type="text"
                    name="placement"
                    value={client.placement}
                    placeholder="Placement (e.g., forearm)"
                    onChange={(e) => emit("placement", e.target.value)}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>

            <div className="text-left">
                <label className="block text-sm text-white/70 mb-1" htmlFor="size">
                    Approximate size (e.g., 4in) <span className="text-white/40">(Optional)</span>
                </label>
                <input
                    id="size"
                    type="text"
                    name="size"
                    value={client.size}
                    placeholder="Approximate size (e.g., 4in)"
                    onChange={(e) => emit("size", e.target.value)}
                    className="w-full h-11 rounded-xl bg-white/10 text-white placeholder:text-white/40 px-4 outline-none focus:ring-2 focus:ring-white/30"
                />
            </div>

            <style>{`
        .budget-range input[type="range"]::-webkit-slider-runnable-track { background: transparent; }
        .budget-range input[type="range"]::-moz-range-track { background: transparent; }
        .budget-range input[type="range"]::-ms-track { background: transparent; border-color: transparent; color: transparent; }
        .budget-range input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; background: transparent; border: 0; }
        .budget-range input[type="range"]::-moz-range-thumb { background: transparent; border: 0; }
        .budget-range input[type="range"]::-ms-thumb { background: transparent; border: 0; }
      `}</style>
        </div>
    );
}
