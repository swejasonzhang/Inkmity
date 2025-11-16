import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, ChevronUp, ChevronDown } from "lucide-react";
import FormInput from "@/components/dashboard/shared/FormInput";

type ArtistProfile = {
    location: string;
    years: string;
    baseRate: string;
    bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
    travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
    styles: string[];
    bio?: string;
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
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 text-center";
    const labelCls = "text-sm font-medium text-white/90 text-center";
    const helpCls = "text-xs text-white/50 text-center";
    const triggerCls = "h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white text-center !justify-center [&_[data-slot=select-value]]:justify-center [&_[data-slot=select-value]]:w-full";
    const contentCls = "rounded-2xl max-h-72 overflow-y-auto border-white/10 bg-[#0b0b0b] text-white";

    function MultiSelect({
        options,
        value,
        onChange,
        placeholder = "Select…",
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
                            className="w-full justify-center rounded-xl border-white/10 bg-white/10 text-white"
                        >
                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
                                {value.length === 0 ? (
                                    <span className="text-white/60 text-center">{placeholder}</span>
                                ) : (
                                    value.map((v) => (
                                        <Badge
                                            key={v}
                                            variant="secondary"
                                            className="bg-white/15 text-white hover:bg-white/25 text-center"
                                        >
                                            {v}
                                            <X
                                                className="ml-1 h-3 w-3 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearOne(v);
                                                }}
                                            />
                                        </Badge>
                                    ))
                                )}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-70" />
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-white/10 bg-[#0b0b0b] text-white"
                        align="start"
                    >
                        <Command className="bg-transparent">
                            <div className="relative">
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => scrollBy(-120)}
                                    className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-md px-2 py-1 text-white/80 hover:bg-white/10"
                                    aria-label="Scroll up"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>

                                <div
                                    ref={listRef}
                                    className="
                    max-h-64 overflow-y-auto
                    scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]
                    [&::-webkit-scrollbar]:hidden
                    pt-6 pb-6
                  "
                                >
                                    <CommandList className="bg-transparent">
                                        <CommandEmpty className="py-6 text-white/60 text-center">
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
                                                        className="relative flex w-full items-center justify-center text-center aria-selected:bg-white/5 data-[selected=true]:bg-white/10"
                                                        data-selected={checked ? "true" : "false"}
                                                    >
                                                        <Check
                                                            className={`absolute left-1/2 -translate-x-full h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        <span className="pointer-events-none text-center">{opt}</span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </div>

                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => scrollBy(120)}
                                    className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 rounded-md px-2 py-1 text-white/80 hover:bg-white/10"
                                    aria-label="Scroll down"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/10 p-2">
                                <span className="text-xs text-white/60">{value.length} selected</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAll}
                                    className="text-white/80 hover:bg-white/10"
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
        <div className="space-y-6">
            <div className="flex items-center justify-center text-center">
                <div>
                    <h3 className="text-lg font-semibold">Artist Details</h3>
                    <p className="text-sm text-muted-foreground">Tell us a bit more about your practice.</p>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Location</label>
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
                            <SelectItem value="__custom__" className="text-center justify-center">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.location === "__custom__" && (
                        <div className="mt-2 w-full">
                            <input name="location" type="text" placeholder="City, State (US)" className={inputCls} onChange={onChange} />
                        </div>
                    )}
                    <p className={helpCls}>Choose a U.S. city. Use "Custom…" to type any U.S. location.</p>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Years of experience</label>
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
                    <p className={helpCls}>Select your total years of tattooing experience.</p>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Base hourly rate (USD)</label>
                    <Select value={artist.baseRate && artist.baseRate !== "__unset__" ? artist.baseRate : "100"} onValueChange={handleSelect("baseRate")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Choose a rate or Custom…" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            {["100", "125", "150", "175", "200", "250", "300"].map((r) => (
                                <SelectItem key={r} value={r} className="text-center justify-center">
                                    ${r}
                                </SelectItem>
                            ))}
                            <SelectItem value="__custom__" className="text-center justify-center">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.baseRate === "__custom__" && (
                        <div className="mt-2 w-full">
                            <FormInput
                                type="number"
                                name="baseRate"
                                min={0}
                                step="0.01"
                                inputMode="decimal"
                                placeholder="Enter custom hourly rate"
                                value=""
                                onChange={onChange}
                                isValid={false}
                                message="Enter a valid amount (e.g., 150 or 150.50)."
                            />
                        </div>
                    )}
                    <p className={helpCls}>Choose an hourly rate or enter a custom amount.</p>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Specialty styles</label>
                    <div className="w-full">
                        <MultiSelect
                            options={SUGGESTED_STYLES}
                            value={styles}
                            onChange={(next) => setStylesCSV(next)}
                            placeholder="Select one or more styles"
                        />
                    </div>
                    <p className={helpCls}>Pick one or more styles and/or type your own. At least one is required.</p>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Booking preference</label>
                    <Select value={artist.bookingPreference || "open"} onValueChange={handleSelect("bookingPreference")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Booking preference" className="text-center" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="open" className="text-center justify-center">Open to new clients</SelectItem>
                            <SelectItem value="waitlist" className="text-center justify-center">Waitlist</SelectItem>
                            <SelectItem value="closed" className="text-center justify-center">Books closed</SelectItem>
                            <SelectItem value="referral" className="text-center justify-center">Referral only</SelectItem>
                            <SelectItem value="guest" className="text-center justify-center">Guest spots only</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className={helpCls}>How you're currently accepting clients.</p>
                </div>

                <div className="space-y-1.5 flex flex-col items-center">
                    <label className={labelCls}>Travel frequency</label>
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
                    <p className={helpCls}>How often you travel for guest spots or tours.</p>
                </div>
            </div>
        </div>
    );
}