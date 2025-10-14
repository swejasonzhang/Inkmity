type Role = "client" | "artist";

type SharedAccount = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

type ClientProfile = {
    budgetMin: string;
    budgetMax: string;
    location: string;
    placement: string;
    size: string;
    notes: string;
    style?: string;
    availability?: string;
};

type ArtistProfile = {
    location: string;
    shop: string;
    years: string;
    baseRate: string;
    instagram: string;
    portfolio: string;
};

const SIZE_LABELS: Record<string, string> = {
    tiny: "Tiny (≤ 2 in)",
    small: "Small (2–4 in)",
    medium: "Medium (4–6 in)",
    large: "Large (6–10 in)",
    xl: "XL (10–14 in)",
    xxl: "XXL (≥ 14 in)",
};

const AVAIL_LABELS: Record<string, string> = {
    all: "No preference",
    "7d": "Next week",
    lt1m: "Under 1 month",
    "1to3m": "1–3 months",
    lte6m: "Up to 6 months",
    waitlist: "Waitlist / Closed",
};

type Props = {
    role: Role;
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfile;
};

export default function ReviewStep({ role, shared, client, artist }: Props) {
    const budgetText =
        client.budgetMin && client.budgetMax
            ? `$${Number(client.budgetMin).toLocaleString()} – $${Number(client.budgetMax).toLocaleString()}`
            : "Not set";

    const sizeText = client.size ? (SIZE_LABELS[client.size] ?? client.size) : "Optional";
    const availText = client.availability ? (AVAIL_LABELS[client.availability] ?? client.availability) : "Optional";
    const styleText = client.style && client.style !== "all" ? client.style : "Optional";

    return (
        <div className="grid gap-6 text-white">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold mb-3">Account</h3>
                <div className="grid gap-2 text-sm text-white/80">
                    <div>
                        <span className="text-white/60">Name: </span>
                        <span>{shared.firstName} {shared.lastName}</span>
                    </div>
                    <div>
                        <span className="text-white/60">Email: </span>
                        <span>{shared.email}</span>
                    </div>
                    <div>
                        <span className="text-white/60">Role: </span>
                        <span className="capitalize">{role}</span>
                    </div>
                </div>
            </section>

            {role === "client" ? (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">Client Details</h3>
                    <div className="grid gap-2 text-sm text-white/80">
                        <div>
                            <span className="text-white/60">Estimated Budget: </span>
                            <span>{budgetText}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Location: </span>
                            <span>{client.location || "Not set"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Preferred Style: </span>
                            <span>{styleText}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Availability: </span>
                            <span>{availText}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Placement: </span>
                            <span>{client.placement || "Optional"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Size: </span>
                            <span>{sizeText}</span>
                        </div>
                    </div>
                </section>
            ) : (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">Artist Details</h3>
                    <div className="grid gap-2 text-sm text-white/80">
                        <div>
                            <span className="text-white/60">Location: </span>
                            <span>{artist.location || "Not set"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Shop: </span>
                            <span>{artist.shop || "Optional"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Years Experience: </span>
                            <span>{artist.years || "Not set"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Base Rate: </span>
                            <span>{artist.baseRate ? `$${Number(artist.baseRate).toLocaleString()}` : "Not set"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Instagram: </span>
                            <span>{artist.instagram || "Optional"}</span>
                        </div>
                        <div>
                            <span className="text-white/60">Portfolio: </span>
                            <span>{artist.portfolio || "Optional"}</span>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
