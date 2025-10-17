import React from "react";
import FormInput from "@/components/dashboard/shared/FormInput";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ArtistProfile = {
    location: string;
    shop: string;
    years: string;
    baseRate: string;
    instagram: string;
    portfolio: string;
};

export default function ArtistDetailsStep({
    artist,
    onChange,
}: {
    artist: ArtistProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const handleSelect =
        (name: keyof ArtistProfile) =>
            (value: string): void => {
                const syntheticEvent = {
                    target: { name, value },
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                onChange(syntheticEvent);
            };

    const inputCls =
        "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20";
    const labelCls = "text-sm font-medium text-white/90";
    const helpCls = "text-xs text-white/50";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold">Artist Details</h3>
                <p className="text-sm text-muted-foreground">
                    Replicated client details styling with dropdowns for every field and a
                    “Custom…” option that reveals an input.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                    <label className={labelCls}>Location</label>
                    <Select value={artist.location || ""} onValueChange={handleSelect("location")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Select your location" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="New York, NY">New York, NY</SelectItem>
                            <SelectItem value="Los Angeles, CA">Los Angeles, CA</SelectItem>
                            <SelectItem value="Chicago, IL">Chicago, IL</SelectItem>
                            <SelectItem value="San Francisco, CA">San Francisco, CA</SelectItem>
                            <SelectItem value="Seattle, WA">Seattle, WA</SelectItem>
                            <SelectItem value="Austin, TX">Austin, TX</SelectItem>
                            <SelectItem value="London, UK">London, UK</SelectItem>
                            <SelectItem value="Toronto, CA">Toronto, CA</SelectItem>
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {artist.location === "__custom__" && (
                        <div className="mt-2">
                            <input
                                name="location"
                                type="text"
                                placeholder="City, State / Region"
                                className={inputCls}
                                onChange={onChange}
                            />
                        </div>
                    )}
                    <p className={helpCls}>
                        {artist.location && artist.location !== "__custom__"
                            ? "Looks good."
                            : "Where are you based?"}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Shop (optional)</label>
                    <Select value={artist.shop || ""} onValueChange={handleSelect("shop")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Select your shop or Custom…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No shop / Independent</SelectItem>
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
                            <input
                                name="shop"
                                type="text"
                                placeholder="Studio or collective name"
                                className={inputCls}
                                onChange={onChange}
                            />
                        </div>
                    )}
                    <p className={helpCls}>{artist.shop ? "Noted." : "Optional"}</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Years of experience</label>
                    <Select value={artist.years || ""} onValueChange={handleSelect("years")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Select years" />
                        </SelectTrigger>
                        <SelectContent>
                            {[
                                "0",
                                "1",
                                "2",
                                "3",
                                "4",
                                "5",
                                "6",
                                "7",
                                "8",
                                "9",
                                "10",
                                "12",
                                "15",
                                "20",
                                "25",
                                "30",
                                "35",
                                "40",
                            ].map((y) => (
                                <SelectItem key={y} value={y}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className={helpCls}>
                        {artist.years ? "Thanks." : "Add years of experience."}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Base hourly rate (USD)</label>
                    <Select value={artist.baseRate || ""} onValueChange={handleSelect("baseRate")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Choose a rate or Custom…" />
                        </SelectTrigger>
                        <SelectContent>
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
                    <p className={helpCls}>
                        {artist.baseRate && artist.baseRate !== "__custom__"
                            ? "Thanks."
                            : "Pick a rate or set a custom amount."}
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Instagram (optional)</label>
                    <Select value={artist.instagram || ""} onValueChange={handleSelect("instagram")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Choose format or Custom…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Skip</SelectItem>
                            <SelectItem value="@">Handle (e.g., @yourname)</SelectItem>
                            <SelectItem value="https://instagram.com/">
                                Full URL (e.g., https://instagram.com/yourname)
                            </SelectItem>
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {(artist.instagram === "__custom__" ||
                        artist.instagram === "@" ||
                        artist.instagram === "https://instagram.com/") && (
                            <div className="mt-2">
                                <input
                                    name="instagram"
                                    type="text"
                                    placeholder={
                                        artist.instagram === "@"
                                            ? "@yourname"
                                            : artist.instagram === "https://instagram.com/"
                                                ? "https://instagram.com/yourname"
                                                : "Handle or URL"
                                    }
                                    className={inputCls}
                                    onChange={onChange}
                                />
                            </div>
                        )}
                    <p className={helpCls}>{artist.instagram ? "Noted." : "Optional"}</p>
                </div>

                <div className="space-y-1.5">
                    <label className={labelCls}>Portfolio website (optional)</label>
                    <Select value={artist.portfolio || ""} onValueChange={handleSelect("portfolio")}>
                        <SelectTrigger className="w-full rounded-xl border border-white/10 bg-white/5 text-white">
                            <SelectValue placeholder="Choose a platform or Custom…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Skip</SelectItem>
                            <SelectItem value="https://behance.net/">Behance</SelectItem>
                            <SelectItem value="https://dribbble.com/">Dribbble</SelectItem>
                            <SelectItem value="https://instagram.com/">Instagram</SelectItem>
                            <SelectItem value="https://linktr.ee/">Linktree</SelectItem>
                            <SelectItem value="__custom__">Custom…</SelectItem>
                        </SelectContent>
                    </Select>
                    {(artist.portfolio === "__custom__" ||
                        artist.portfolio === "https://behance.net/" ||
                        artist.portfolio === "https://dribbble.com/" ||
                        artist.portfolio === "https://instagram.com/" ||
                        artist.portfolio === "https://linktr.ee/") && (
                            <div className="mt-2">
                                <input
                                    name="portfolio"
                                    type="url"
                                    placeholder={
                                        artist.portfolio && artist.portfolio !== "__custom__"
                                            ? `${artist.portfolio}your-page`
                                            : "https://your-portfolio.com"
                                    }
                                    className={inputCls}
                                    onChange={onChange}
                                />
                            </div>
                        )}
                    <p className={helpCls}>{artist.portfolio ? "Noted." : "Optional"}</p>
                </div>
            </div>
        </div>
    );
}