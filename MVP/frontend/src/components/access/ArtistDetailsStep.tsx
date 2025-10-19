import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const toggleStyle = (style: string) => {
        const s = style.trim();
        const has = styles.includes(s);
        const next = has ? styles.filter((x) => x !== s) : [...styles, s];
        setStylesCSV(next);
    };
    const setStylesFromCSV = (csv: string) => {
        const next = csv
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        setStylesCSV(next);
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SUGGESTED_STYLES.map((s) => {
                            const checked = styles.includes(s);
                            return (
                                <label
                                    key={s}
                                    className={`cursor-pointer select-none rounded-xl border px-3 py-2 text-sm ${checked ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/80"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mr-2 align-middle accent-white"
                                        checked={checked}
                                        onChange={() => toggleStyle(s)}
                                    />
                                    {s}
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-3">
                        <input
                            name="stylesCSV"
                            type="text"
                            placeholder="Add more styles, comma-separated (e.g., Minimalist, Ornamental)"
                            className={inputCls}
                            value={styles.join(", ")}
                            onChange={(e) => setStylesFromCSV(e.target.value)}
                        />
                    </div>
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