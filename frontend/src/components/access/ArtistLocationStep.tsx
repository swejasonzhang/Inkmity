import React from "react";
import { MapPin } from "lucide-react";
import StudioLocationPicker from "@/components/studio/StudioLocationPicker";

type ArtistProfile = {
    shop?: string;
    shopAddress?: string;
    shopLat?: number;
    shopLng?: number;
};

export default function ArtistLocationStep({
    artist,
    onChange,
}: {
    artist: ArtistProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    const fieldCls = "space-y-1 flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 md:py-2 transition hover:border-white/20";
    const labelCls = "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-semibold capitalize text-white/90 text-center";

    return (
        <div className="space-y-1.5 md:space-y-2">
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
                <h3 className="text-lg font-bold text-white">Shop &amp; Location</h3>
                <p className="text-xs text-white/55">Where do you tattoo? Add your shop — or skip and set it up later.</p>
            </div>

            <div className={`${fieldCls} !items-stretch`}>
                <label className={labelCls}><MapPin className="h-3.5 w-3.5 shrink-0 text-white" strokeWidth={2.75} />Find your shop <span className="text-white/40 normal-case">(optional)</span></label>
                <StudioLocationPicker
                    compact
                    value={{ name: artist.shop, address: artist.shopAddress || "", city: "", lat: artist.shopLat, lng: artist.shopLng }}
                    onChange={(loc) => {
                        onChange({ target: { name: "shop", value: loc.name || loc.address || "" } } as React.ChangeEvent<HTMLInputElement>);
                        onChange({ target: { name: "shopAddress", value: loc.address || "" } } as React.ChangeEvent<HTMLInputElement>);
                    }}
                />
            </div>
        </div>
    );
}
