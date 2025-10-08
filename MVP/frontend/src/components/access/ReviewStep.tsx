type Role = "client" | "artist";

type SharedAccount = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

type ClientProfile = { budget: string; location: string; placement: string; size: string; notes: string };
type ArtistProfile = { location: string; shop: string; years: string; baseRate: string; instagram: string; portfolio: string };

type Props = {
    role: Role;
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfile;
};

export default function ReviewStep({ role, shared, client, artist }: Props) {
    return (
        <div className="grid gap-4 text-white/90 w-full max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-white">Review</h3>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-sm text-white/60 mb-2">Account</div>
                <div className="grid gap-1">
                    <div><span className="text-white/60">Name:</span> {shared.firstName} {shared.lastName}</div>
                    <div><span className="text-white/60">Email:</span> {shared.email}</div>
                    <div><span className="text-white/60">Role:</span> {role}</div>
                </div>
            </div>

            {role === "client" ? (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-sm text-white/60 mb-2">Client details</div>
                    <div className="grid gap-1">
                        <div><span className="text-white/60">Budget:</span> {client.budget || "—"}</div>
                        <div><span className="text-white/60">Location:</span> {client.location || "—"}</div>
                        <div><span className="text-white/60">Placement:</span> {client.placement || "—"}</div>
                        <div><span className="text-white/60">Size:</span> {client.size || "—"}</div>
                        <div><span className="text-white/60">Notes:</span> {client.notes || "—"}</div>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-sm text-white/60 mb-2">Artist details</div>
                    <div className="grid gap-1">
                        <div><span className="text-white/60">Location:</span> {artist.location || "—"}</div>
                        <div><span className="text-white/60">Shop:</span> {artist.shop || "—"}</div>
                        <div><span className="text-white/60">Years:</span> {artist.years || "—"}</div>
                        <div><span className="text-white/60">Base rate:</span> {artist.baseRate || "—"}</div>
                        <div><span className="text-white/60">Instagram:</span> {artist.instagram || "—"}</div>
                        <div><span className="text-white/60">Portfolio:</span> {artist.portfolio || "—"}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
