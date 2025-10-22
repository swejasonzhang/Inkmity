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
    shop: string;
    years: string;
    baseRate: string;
    bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
    travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
    styles?: string[];
};

export default function ArtistDetailsStep({
    artist,
    onChange,
}: {
    artist: ArtistProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const normalizeSelectOutbound = (name: keyof ArtistProfile, v: string) => {
        if (name === "shop" && v === "__skip__") return "";
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
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20";
    const labelCls = "text-sm font-medium text-white/90";
    const helpCls = "text-xs text-white/50";
    const triggerCls = "h-11 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-white";
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
                            className="w-full justify-between rounded-xl border-white/10 bg-white/10 text-white"
                        >
                            <div className="flex flex-wrap items-center gap-1.5 text-left">
                                {value.length === 0 ? (
                                    <span className="text-white/60">{placeholder}</span>
                                ) : (
                                    value.map((v) => (
                                        <Badge
                                            key={v}
                                            variant="secondary"
                                            className="bg-white/15 text-white hover:bg-white/25"
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
                                                            className={`absolute left-3 h-4 w-4 ${checked ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        <span className="pointer-events-none">{opt}</span>
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
                <div className="space-y-1.5">
                    <label className={labelCls}>Location</label>
                    <Select value={artist.location || "__unset__"} onValueChange={handleSelect("location")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Select your location (US only)" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="New York, NY">New York, NY</SelectItem>
                            <SelectItem value="Los Angeles, CA">Los Angeles, CA</SelectItem>
                            <SelectItem value="Chicago, IL">Chicago, IL</SelectItem>
                            <SelectItem value="Houston, TX">Houston, TX</SelectItem>
                            <SelectItem value="Phoenix, AZ">Phoenix, AZ</SelectItem>
                            <SelectItem value="Philadelphia, PA">Philadelphia, PA</SelectItem>
                            <SelectItem value="San Antonio, TX">San Antonio, TX</SelectItem>
                            <SelectItem value="San Diego, CA">San Diego, CA</SelectItem>
                            <SelectItem value="Dallas, TX">Dallas, TX</SelectItem>
                            <SelectItem value="San Jose, CA">San Jose, CA</SelectItem>
                            <SelectItem value="Austin, TX">Austin, TX</SelectItem>
                            <SelectItem value="Jacksonville, FL">Jacksonville, FL</SelectItem>
                            <SelectItem value="San Francisco, CA">San Francisco, CA</SelectItem>
                            <SelectItem value="Columbus, OH">Columbus, OH</SelectItem>
                            <SelectItem value="Charlotte, NC">Charlotte, NC</SelectItem>
                            <SelectItem value="Seattle, WA">Seattle, WA</SelectItem>
                            <SelectItem value="Denver, CO">Denver, CO</SelectItem>
                            <SelectItem value="Washington, DC">Washington, DC</SelectItem>
                            <SelectItem value="Boston, MA">Boston, MA</SelectItem>
                            <SelectItem value="Nashville, TN">Nashville, TN</SelectItem>
                            <SelectItem value="Portland, OR">Portland, OR</SelectItem>
                            <SelectItem value="Las Vegas, NV">Las Vegas, NV</SelectItem>
                            <SelectItem value="Miami, FL">Miami, FL</SelectItem>
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.location === "__custom__" && (
                        <div className="mt-2">
                            <input name="location" type="text" placeholder="City, State (US)" className={inputCls} onChange={onChange} />
                        </div>
                    )}
                    <p className={helpCls}>Choose a U.S. city. Use “Custom…” to type any U.S. location.</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Shop (optional)</label>
                    <Select value={artist.shop || "__skip__"} onValueChange={handleSelect("shop")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Select your shop or Custom…" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="__skip__">No shop / Independent</SelectItem>
                            <SelectItem value="Bang Bang Tattoo">Bang Bang Tattoo</SelectItem>
                            <SelectItem value="Shamrock Social Club">Shamrock Social Club</SelectItem>
                            <SelectItem value="Great Lakes Tattoo">Great Lakes Tattoo</SelectItem>
                            <SelectItem value="Seventh Son Tattoo">Seventh Son Tattoo</SelectItem>
                            <SelectItem value="Saved Tattoo">Saved Tattoo</SelectItem>
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.shop === "__custom__" && (
                        <div className="mt-2">
                            <input name="shop" type="text" placeholder="Studio or collective name" className={inputCls} onChange={onChange} />
                        </div>
                    )}
                    <p className={helpCls}>Pick your studio, select independent, or enter a custom name.</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Years of experience</label>
                    <Select value={artist.years || "__unset__"} onValueChange={handleSelect("years")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Select years" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12", "15", "20", "25", "30", "35", "40"].map((y) => (
                                <SelectItem key={y} value={y}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className={helpCls}>Select your total years of tattooing experience.</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Base hourly rate (USD)</label>
                    <Select value={artist.baseRate || "__unset__"} onValueChange={handleSelect("baseRate")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Choose a rate or Custom…" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            {["100", "125", "150", "175", "200", "250", "300"].map((r) => (
                                <SelectItem key={r} value={r}>
                                    ${r}
                                </SelectItem>
                            ))}
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.baseRate === "__custom__" && (
                        <div className="mt-2">
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

                <div className="space-y-1.5 md:col-span-2">
                    <label className={labelCls}>Specialty styles</label>
                    <MultiSelect
                        options={SUGGESTED_STYLES}
                        value={styles}
                        onChange={(next) => setStylesCSV(next)}
                        placeholder="Select one or more styles"
                    />
                    <p className={helpCls}>Pick one or more styles and/or type your own. At least one is required.</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Booking preference</label>
                    <Select value={artist.bookingPreference || "open"} onValueChange={handleSelect("bookingPreference")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Booking preference" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="open">Open to new clients</SelectItem>
                            <SelectItem value="waitlist">Waitlist</SelectItem>
                            <SelectItem value="closed">Books closed</SelectItem>
                            <SelectItem value="referral">Referral only</SelectItem>
                            <SelectItem value="guest">Guest spots only</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className={helpCls}>How you’re currently accepting clients.</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Travel frequency</label>
                    <Select value={artist.travelFrequency || "rare"} onValueChange={handleSelect("travelFrequency")}>
                        <SelectTrigger className={triggerCls}>
                            <SelectValue placeholder="Travel frequency" />
                        </SelectTrigger>
                        <SelectContent className={contentCls}>
                            <SelectItem value="rare">Rarely</SelectItem>
                            <SelectItem value="sometimes">Sometimes</SelectItem>
                            <SelectItem value="often">Often</SelectItem>
                            <SelectItem value="touring">Touring</SelectItem>
                            <SelectItem value="guest_only">Guest only</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className={helpCls}>How often you travel for guest spots or tours.</p>
                </div>
            </div>
        </div>
    );
}