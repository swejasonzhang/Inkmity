import React from "react";
import { Badge } from "@/components/ui/badge";

type Role = "client" | "artist";
type SharedAccount = { username: string; email: string; password?: string };
type ClientProfile = {
    budgetMin: string;
    budgetMax: string;
    location: string;
    placement: string;
    size: string;
    style?: string;
    availability?: string;
};
type ArtistProfileReview = {
    location: string;
    years: string;
    baseRate: string;
    bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
    travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
    styles?: string[];
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
const BOOKING_LABELS = {
    open: "Open to new clients",
    waitlist: "Waitlist",
    closed: "Books closed",
    referral: "Referral only",
    guest: "Guest spots only",
} as const;
const TRAVEL_LABELS = {
    rare: "Rarely",
    sometimes: "Sometimes",
    often: "Often",
    touring: "Touring",
    guest_only: "Guest only",
} as const;

type Props = {
    role: Role;
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfileReview;
    clientImages?: string[];
    artistImages?: string[];
    bio: string;
    onBioChange: React.ChangeEventHandler<HTMLTextAreaElement>;
};

function InlineWrapBadges({ items }: { items?: string[] }) {
    if (!items || items.length === 0) return <span className="text-white/50">Not set</span>;
    return (
        <div className="flex flex-wrap justify-center gap-1">
            {items.map((s) => (
                <Badge key={s} variant="secondary" className="bg-white/15 text-white px-1.5 py-0.5 text-[11px]">
                    {s}
                </Badge>
            ))}
        </div>
    );
}

export default function ReviewStep({
    role,
    shared,
    client,
    artist,
    clientImages = [],
    artistImages = [],
    bio,
    onBioChange,
}: Props) {
    const budgetText =
        client.budgetMin && client.budgetMax
            ? `$${Number(client.budgetMin).toLocaleString()} – $${Number(client.budgetMax).toLocaleString()}`
            : "Not set";
    const sizeText = client.size ? SIZE_LABELS[client.size] ?? client.size : "Optional";
    const availText = client.availability ? AVAIL_LABELS[client.availability] ?? client.availability : "Optional";
    const styleText = client.style && client.style !== "all" ? client.style : "Optional";
    const imgs = role === "client" ? clientImages.filter(Boolean) : artistImages.filter(Boolean);
    const tiles = [0, 1, 2];

    const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div className="grid justify-items-center items-center gap-0.5">
            <span className="text-[11px] text-white/60 text-center">{label}</span>
            <div className="min-w-0 text-[12px] text-white/80 text-center flex items-center justify-center">{children}</div>
        </div>
    );

    const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <section className="rounded-xl border border-white/10 bg-white/5 p-3 text-center h-full flex flex-col">
            <h3 className="text-sm font-semibold mb-2">{title}</h3>
            <div className="grid gap-2 flex-1 items-center justify-center">{children}</div>
        </section>
    );

    return (
        <div className="grid gap-3 text-white place-items-center">
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                <Card title="Account">
                    <div className="flex flex-col items-center justify-center gap-2 w-full">
                        <Row label="Username:">
                            <span className="text-sm">{shared.username}</span>
                        </Row>
                        <Row label="Email:">
                            <span className="text-sm">{shared.email}</span>
                        </Row>
                        <Row label="Role:">
                            <span className="capitalize text-sm">{role}</span>
                        </Row>
                    </div>
                </Card>

                {role === "client" ? (
                    <Card title="Client Details">
                        <div className="grid grid-cols-2 gap-2 items-center justify-items-center w-full">
                            <Row label="Budget:">
                                <span>{budgetText}</span>
                            </Row>
                            <Row label="Location:">
                                <span>{client.location || "Not set"}</span>
                            </Row>
                            <Row label="Style:">
                                <span>{styleText}</span>
                            </Row>
                            <Row label="Availability:">
                                <span>{availText}</span>
                            </Row>
                            <Row label="Placement:">
                                <span>{client.placement || "Optional"}</span>
                            </Row>
                            <Row label="Size:">
                                <span>{sizeText}</span>
                            </Row>
                        </div>
                    </Card>
                ) : (
                    <Card title="Artist Details">
                        <div className="grid grid-cols-2 gap-2 items-center justify-items-center w-full">
                            <Row label="Location:">
                                <span>{artist.location || "Not set"}</span>
                            </Row>
                            <Row label="Years:">
                                <span>{artist.years === "0" ? "<1" : artist.years || "Not set"}</span>
                            </Row>
                            <Row label="Base Rate:">
                                <span>{artist.baseRate ? `$${Number(artist.baseRate).toLocaleString()}` : "Not set"}</span>
                            </Row>
                            <Row label="Booking:">
                                <span>{artist.bookingPreference ? BOOKING_LABELS[artist.bookingPreference] : "Not set"}</span>
                            </Row>
                            <div className="col-span-2 flex items-center justify-center">
                                <Row label="Travel:">
                                    <span>{artist.travelFrequency ? TRAVEL_LABELS[artist.travelFrequency] : "Not set"}</span>
                                </Row>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {role === "artist" && (
                <div className="w-full max-w-5xl">
                    <Card title="Styles">
                        <div className="flex items-center justify-center w-full">
                            <Row label="">
                                <InlineWrapBadges items={artist.styles} />
                            </Row>
                        </div>
                    </Card>
                </div>
            )}

            <section className="w-full max-w-5xl rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <h3 className="text-sm font-semibold mb-2">{role === "client" ? "Reference Images" : "Portfolio Highlights"}</h3>
                <div className="grid grid-cols-3 gap-1.5">
                    {tiles.map((i) => {
                        const u = imgs[i];
                        return (
                            <div key={i} className="aspect-square w-full rounded-md overflow-hidden border border-white/10 bg-white/5">
                                {u ? (
                                    <img src={u} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full grid place-items-center text-[10px] text-white/40">Empty</div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <p className="mt-2 text-[11px] text-white/60">Images will appear larger on your dashboard.</p>
            </section>

            {role === "artist" && (
                <section className="w-full max-w-5xl rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <h3 className="text-sm font-semibold mb-2">Bio (optional)</h3>
                    <textarea
                        value={bio}
                        onChange={onBioChange}
                        rows={5}
                        placeholder="Add notes about style, experience, booking details."
                        className="w-full rounded-xl bg-white/10 border-0 text-white text-center placeholder:text-white/40 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    />
                </section>
            )}
        </div>
    );
}