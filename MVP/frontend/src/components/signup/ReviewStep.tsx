import { Sparkles } from "lucide-react";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password: string };
type ClientProfile = { budget: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };

export default function ReviewStep({
    role, shared, client, artist,
}: {
    role: Role;
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfile;
}) {
    const rows =
        role === "client"
            ? [
                ["Username", shared.username],
                ["Email", shared.email],
                ["Budget", client.budget ? `$${client.budget}` : "-"],
                ["Location", client.location || "-"],
                ["Placement", client.placement || "-"],
                ["Size", client.size || "-"],
            ]
            : [
                ["Username", shared.username],
                ["Email", shared.email],
                ["Location", artist.location || "-"],
                ["Shop", artist.shop || "-"],
                ["Experience", artist.years ? `${artist.years} yrs` : "-"],
                ["Base rate", artist.baseRate ? `$${artist.baseRate}/hr` : "-"],
            ];

    return (
        <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Review</span>
            </div>
            <div className="grid gap-2 text-sm text-white/80">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className="font-medium text-white">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}