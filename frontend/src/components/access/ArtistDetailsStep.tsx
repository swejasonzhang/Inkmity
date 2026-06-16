import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronUp, ChevronDown, MapPin, Clock, DollarSign, Brush, CalendarCheck, Plane } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import StudioLocationPicker from "@/components/studio/StudioLocationPicker";

type ArtistProfile = {
    location: string;
    years: string;
    baseRate: string;
    baseRateMax?: string;
    bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
    travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
    styles: string[];
    bio?: string;
    shop?: string;
    shopAddress?: string;
    shopLat?: number;
    shopLng?: number;
};

export default function ArtistDetailsStep({
    artist,
    onChange,
}: {
    artist: ArtistProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const normalizeSelectOutbound = (_name: keyof ArtistProfile, v: string) => {
        return v;
    };

    const handleSelect =
        (name: keyof ArtistProfile) =>
            (value: string): void => {
                const normalized = normalizeSelectOutbound(name, value);
                const syntheticEvent = {
                    target: { name, value: normalized },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
            };

    const styles = Array.isArray(artist.styles) ? artist.styles : [];
    const setStylesCSV = (next: string[]) => {
        const syntheticEvent = {
            target: { name: "stylesCSV", value: next.join(", ") },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
    };

    const RATE_MIN = 25;
    const RATE_MAX = 500;
    const rateLow = Math.min(Math.max(Number(artist.baseRate) || 100, RATE_MIN), RATE_MAX);
    const rateHigh = Math.min(Math.max(Number(artist.baseRateMax) || Math.max(rateLow + 50, 200), rateLow), RATE_MAX);
    const dispatch = (name: keyof ArtistProfile, value: string) =>
        onChange({ target: { name, value } } as unknown as React.ChangeEvent<HTMLInputElement>);
    const onRateChange = (vals: number[]) => {
        const [a, b] = vals;
        dispatch("baseRate", String(Math.round(a)));
        dispatch("baseRateMax", String(Math.round(b)));
    };

    const SUGGESTED_STYLES = [
        "Fine Line",
        "Traditional",
        "Neo-Traditional",
        "Blackwork",
        "Japanese",
        "Realism",
        "Surrealism",
        "Watercolor",
        "Tribal",
        "Geometric",
        "Script",
        "Illustrative",
        "Micro",
        "Dotwork",
    ];

    const inputCls =
        "w-full rounded-xl border border-white/15 bg-neutral-900/80 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center truncate";
    const fieldCls = "space-y-1 flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 md:py-2 transition hover:border-white/20";
    const labelCls = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold capitalize text-white/90 text-center";
    const triggerCls =
        "relative h-8 w-full rounded-xl border border-white/15 bg-neutral-900/70 pl-9 pr-9 text-xs text-white !justify-center " +
        "data-[placeholder]:text-white/45 " +
        "[&>svg]:absolute [&>svg]:right-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2 [&>svg]:text-white/70 [&>svg]:opacity-100 " +
        "[&_[data-slot=select-value]]:w-full [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:text-center [&_[data-slot=select-value]]:truncate";
    const contentCls =
        "w-[var(--radix-select-trigger-width)] rounded-xl max-h-72 overflow-y-auto border-white/10 bg-neutral-900 text-white " +
        "[&_[data-slot=select-item]]:justify-center [&_[data-slot=select-item]]:text-center [&_[data-slot=select-item]]:pl-8 [&_[data-slot=select-item]]:truncate [&_[data-slot=select-item]]:text-xs [&_[data-slot=select-item]]:capitalize [&_[data-slot=select-item]]:text-white";

    function MultiSelect({
        options,
        value,
        onChange,
        placeholder = "Select...",
    }: {
        options: string[];
        value: string[];
        onChange: (next: string[]) => void;
        placeholder?: string;
    }) {
        const [open, setOpen] = React.useState(false);
        const listRef = React.useRef<HTMLDivElement | null>(null);

        const toggle = (opt: string) => {
            const exists = value.includes(opt);
            onChange(exists ? value.filter((v) => v !== opt) : [...value, opt]);
        };
        const clearOne = (opt: string) => onChange(value.filter((v) => v !== opt));
        const clearAll = () => onChange([]);

        const scrollBy = (delta: number) => {
            const el = listRef.current;
            if (!el) return;
            el.scrollBy({ top: delta, behavior: "smooth" });
        };

        return (
            <div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="relative h-8 w-full justify-center rounded-xl border border-white/15 bg-neutral-900/70 pl-9 pr-9 text-xs text-white min-h-0 [&>svg]:absolute [&>svg]:right-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2 [&>svg]:text-white/60"
                        >
                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-center max-w-full overflow-hidden">
                                {value.length === 0 ? (
                                    <span className="text-white/45 text-center">{placeholder}</span>
                                ) : (
                                    <>
                                        {value.slice(0, 1).map((v) => (
                                            <Badge
                                                key={v}
                                                variant="secondary"
                                                className="bg-white/10 text-white hover:bg-white/20 text-center max-w-full truncate"
                                            >
                                                <span className="truncate">{v}</span>
                                                <button
                                                    type="button"
                                                    className="ml-1 h-3 w-3 cursor-pointer inline-flex items-center justify-center hover:opacity-80 flex-shrink-0"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        clearOne(v);
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                        {value.length > 1 && (
                                            <span className="text-white/45 text-xs whitespace-nowrap">+{value.length - 1} more</span>
                                        )}
                                    </>
                                )}
                            </div>
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-white/10 bg-neutral-900 text-white"
                        align="start"
                    >
                        <Command className="bg-transparent">
                            <div className="relative flex flex-col max-h-64">
                                <div className="flex-shrink-0 flex items-center justify-center py-2 bg-neutral-900 border-b border-white/10">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => scrollBy(-120)}
                                        className="rounded-md px-2 py-1 text-white/70 hover:bg-white/10 bg-neutral-900/90 backdrop-blur-sm"
                                        aria-label="Scroll up"
                                    >
                                        <ChevronUp className="h-4 w-4" />
                                    </button>
                                </div>

                                <div
                                    ref={listRef}
                                    className="
                    flex-1 min-h-0 overflow-y-auto overflow-x-hidden
                    scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]
                    [&::-webkit-scrollbar]:hidden
                    scroll-smooth
                  "
                                >
                                    <CommandList className="bg-transparent">
                                        <CommandEmpty className="py-6 text-white/45 text-center">
                                            No results
                                        </CommandEmpty>
                                        <CommandGroup>
                                            {options.map((opt) => {
                                                const checked = value.includes(opt);
                                                return (
                                                    <CommandItem
                                                        key={opt}
                                                        value={opt}
                                                        onSelect={() => toggle(opt)}
                                                        className="relative flex w-full items-center justify-center text-center aria-selected:bg-white/10 data-[selected=true]:bg-white/10 px-8 capitalize"
                                                        data-selected={checked ? "true" : "false"}
                                                    >
                                                        <Check
                                                            className={`absolute left-4 h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        <span className="pointer-events-none text-center">{opt}</span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </div>

                                <div className="flex-shrink-0 flex items-center justify-center py-2 bg-neutral-900 border-t border-white/10">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => scrollBy(120)}
                                        className="rounded-md px-2 py-1 text-white/70 hover:bg-white/10 bg-neutral-900/90 backdrop-blur-sm"
                                        aria-label="Scroll down"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/10 p-2 bg-neutral-900">
                                <span className="text-xs text-white/45">{value.length} selected</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    className="text-white/70 hover:bg-white/10"
                                >
                                    Clear
                                </Button>
                            </div>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }

    return (
        <div className="space-y-1.5 md:space-y-2">
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
                <h3 className="text-lg font-bold text-white">Artist Details</h3>
                <p className="text-xs text-white/55">Tell us about your practice — or use “Skip now” to set defaults.</p>
            </div>

            <div className={`${fieldCls} !items-stretch`}>
                <label className={labelCls}><MapPin className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Shop <span className="text-white/40 normal-case">(optional)</span></label>
                <input
                    name="shop"
                    type="text"
                    value={artist.shop || ""}
                    placeholder="Shop name"
                    className={inputCls}
                    onChange={onChange}
                />
                <StudioLocationPicker
                    compact
                    value={{ name: artist.shop, address: artist.shopAddress || "", city: "", lat: artist.shopLat, lng: artist.shopLng }}
                    onChange={(loc) => {
                        onChange({ target: { name: "shop", value: loc.name || "" } } as React.ChangeEvent<HTMLInputElement>);
                        onChange({ target: { name: "shopAddress", value: loc.address || "" } } as React.ChangeEvent<HTMLInputElement>);
                    }}
                />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                <div className={fieldCls}>
                    <label className={labelCls}><MapPin className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Location</label>
                    <Select value={artist.location && artist.location !== "__unset__" ? artist.location : "New York, NY"} onValueChange={handleSelect("location")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Select your location (US only)" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="New York, NY" className="text-center justify-center">New York, NY</SelectItem>
                            <SelectItem value="Los Angeles, CA" className="text-center justify-center">Los Angeles, CA</SelectItem>
                            <SelectItem value="Chicago, IL" className="text-center justify-center">Chicago, IL</SelectItem>
                            <SelectItem value="Houston, TX" className="text-center justify-center">Houston, TX</SelectItem>
                            <SelectItem value="Phoenix, AZ" className="text-center justify-center">Phoenix, AZ</SelectItem>
                            <SelectItem value="Philadelphia, PA" className="text-center justify-center">Philadelphia, PA</SelectItem>
                            <SelectItem value="San Antonio, TX" className="text-center justify-center">San Antonio, TX</SelectItem>
                            <SelectItem value="San Diego, CA" className="text-center justify-center">San Diego, CA</SelectItem>
                            <SelectItem value="Dallas, TX" className="text-center justify-center">Dallas, TX</SelectItem>
                            <SelectItem value="San Jose, CA" className="text-center justify-center">San Jose, CA</SelectItem>
                            <SelectItem value="Austin, TX" className="text-center justify-center">Austin, TX</SelectItem>
                            <SelectItem value="Jacksonville, FL" className="text-center justify-center">Jacksonville, FL</SelectItem>
                            <SelectItem value="San Francisco, CA" className="text-center justify-center">San Francisco, CA</SelectItem>
                            <SelectItem value="Columbus, OH" className="text-center justify-center">Columbus, OH</SelectItem>
                            <SelectItem value="Charlotte, NC" className="text-center justify-center">Charlotte, NC</SelectItem>
                            <SelectItem value="Seattle, WA" className="text-center justify-center">Seattle, WA</SelectItem>
                            <SelectItem value="Denver, CO" className="text-center justify-center">Denver, CO</SelectItem>
                            <SelectItem value="Washington, DC" className="text-center justify-center">Washington, DC</SelectItem>
                            <SelectItem value="Boston, MA" className="text-center justify-center">Boston, MA</SelectItem>
                            <SelectItem value="Nashville, TN" className="text-center justify-center">Nashville, TN</SelectItem>
                            <SelectItem value="Portland, OR" className="text-center justify-center">Portland, OR</SelectItem>
                            <SelectItem value="Las Vegas, NV" className="text-center justify-center">Las Vegas, NV</SelectItem>
                            <SelectItem value="Miami, FL" className="text-center justify-center">Miami, FL</SelectItem>
                            <SelectItem value="__custom__" className="text-center justify-center">Custom...</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.location === "__custom__" && (
                        <div className="mt-2 w-full">
                            <input name="location" type="text" placeholder="City, State (US)" className={inputCls} onChange={onChange} />
                        </div>
                    )}
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Clock className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Experience</label>
                    <Select value={artist.years && artist.years !== "__unset__" ? artist.years : "0"} onValueChange={handleSelect("years")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Select years" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            {[["<1", "0"], "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "15", "20", "25", "30", "35", "40"].map((y) => {
                                const value = Array.isArray(y) ? y[1] : y;
                                const display = Array.isArray(y) ? y[0] : y;
                                return (
                                    <SelectItem key={value} value={value} className="text-center justify-center">
                                        {display}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                <div className={`${fieldCls} col-span-2 order-first`}>
                    <label className={labelCls}><DollarSign className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Hourly rate</label>
                    <div className="w-full max-w-md px-1 pt-2">
                        <Slider
                            min={RATE_MIN}
                            max={RATE_MAX}
                            step={5}
                            value={[rateLow, rateHigh]}
                            onValueChange={onRateChange}
                            className="w-full [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:bg-neutral-900 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:ring-white/30"
                        />
                        <div className="mt-3 flex items-stretch justify-center gap-2">
                            <div className="flex-1 max-w-[7.5rem] flex flex-col items-center gap-0.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Min</span>
                                <span className="text-base font-bold leading-none tabular-nums text-white">${rateLow}</span>
                            </div>
                            <div className="flex-1 max-w-[7.5rem] flex flex-col items-center gap-0.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Max</span>
                                <span className="text-base font-bold leading-none tabular-nums text-white">${rateHigh}{rateHigh >= RATE_MAX ? "+" : ""}</span>
                            </div>
                        </div>
                        <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">USD / hour</p>
                    </div>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><CalendarCheck className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Booking</label>
                    <Select value={artist.bookingPreference || "open"} onValueChange={handleSelect("bookingPreference")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Booking preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="open" className="text-center justify-center">Open</SelectItem>
                            <SelectItem value="waitlist" className="text-center justify-center">Waitlist</SelectItem>
                            <SelectItem value="closed" className="text-center justify-center">Closed</SelectItem>
                            <SelectItem value="referral" className="text-center justify-center">Referral</SelectItem>
                            <SelectItem value="guest" className="text-center justify-center">Guest spots</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className={fieldCls}>
                    <label className={labelCls}><Plane className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Travel</label>
                    <Select value={artist.travelFrequency || "rare"} onValueChange={handleSelect("travelFrequency")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Travel frequency" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="rare" className="text-center justify-center">Rarely</SelectItem>
                            <SelectItem value="sometimes" className="text-center justify-center">Sometimes</SelectItem>
                            <SelectItem value="often" className="text-center justify-center">Often</SelectItem>
                            <SelectItem value="touring" className="text-center justify-center">Touring</SelectItem>
                            <SelectItem value="guest_only" className="text-center justify-center">Guest only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className={`${fieldCls} col-span-2`}>
                    <label className={labelCls}><Brush className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Styles</label>
                    <div className="w-full max-w-md">
                        <MultiSelect
                            options={SUGGESTED_STYLES}
                            value={styles}
                            onChange={(next) => setStylesCSV(next)}
                            placeholder="Select one or more styles"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}