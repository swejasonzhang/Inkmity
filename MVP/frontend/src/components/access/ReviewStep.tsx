import React from "react";
import { Badge } from "@/components/ui/badge";

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

type ArtistProfileReview = {
    location: string;
    shop: string;
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

const BOOKING_LABELS: Record<NonNullable<ArtistProfileReview["bookingPreference"]>, string> = {
    open: "Open to new clients",
    waitlist: "Waitlist",
    closed: "Books closed",
    referral: "Referral only",
    guest: "Guest spots only",
};

const TRAVEL_LABELS: Record<NonNullable<ArtistProfileReview["travelFrequency"]>, string> = {
    rare: "Rarely",
    sometimes: "Sometimes",
    often: "Often",
    touring: "Touring",
    guest_only: "Guest only",
};

type Props = {
    role: Role;
    shared: SharedAccount;
    client: ClientProfile;
    artist: ArtistProfileReview;
};

function InlineWrapBadges({ items }: { items?: string[] }) {
    if (!items || items.length === 0) return <span className="text-white/50">Not set</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((s) => (
                <Badge key={s} variant="secondary" className="bg-white/15 text-white">
                    {s}
                </Badge>
            ))}
        </div>
    );
}

export default function ReviewStep({ role, shared, client, artist }: Props) {
    const budgetText =
        client.budgetMin && client.budgetMax
            ? `$${Number(client.budgetMin).toLocaleString()} – $${Number(client.budgetMax).toLocaleString()}`
            : "Not set";

    const sizeText = client.size ? SIZE_LABELS[client.size] ?? client.size : "Optional";
    const availText = client.availability ? AVAIL_LABELS[client.availability] ?? client.availability : "Optional";
    const styleText = client.style && client.style !== "all" ? client.style : "Optional";
    const shopText = artist.shop?.trim() ? artist.shop : "No shop / Independent";

    const Row = ({
        label,
        children,
    }: {
        label: string;
        children: React.ReactNode;
    }) => (
        <div className="flex items-start gap-4">
            <span className="shrink-0 text-sm text-white/60">{label}</span>
            <div className="min-w-0 grow text-sm text-white/80">{children}</div>
        </div>
    );

    return (
        <div className="grid gap-6 text-white">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold mb-3">Account</h3>
                <div className="grid gap-2">
                    <Row label="Name:">
                        <span>
                            {shared.firstName} {shared.lastName}
                        </span>
                    </Row>
                    <Row label="Email:">
                        <span>{shared.email}</span>
                    </Row>
                    <Row label="Role:">
                        <span className="capitalize">{role}</span>
                    </Row>
                </div>
            </section>

            {role === "client" ? (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">Client Details</h3>
                    <div className="grid gap-2">
                        <Row label="Estimated Budget:">
                            <span>{budgetText}</span>
                        </Row>
                        <Row label="Location:">
                            <span>{client.location || "Not set"}</span>
                        </Row>
                        <Row label="Preferred Style:">
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
                </section>
            ) : (
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-lg font-semibold mb-3">Artist Details</h3>
                    <div className="grid gap-2">
                        <Row label="Location:">
                            <span>{artist.location || "Not set"}</span>
                        </Row>
                        <Row label="Shop:">
                            <span>{shopText}</span>
                        </Row>
                        <Row label="Years Experience:">
                            <span>{artist.years || "Not set"}</span>
                        </Row>
                        <Row label="Base Rate:">
                            <span>{artist.baseRate ? `$${Number(artist.baseRate).toLocaleString()}` : "Not set"}</span>
                        </Row>
                        <Row label="Booking Preference:">
                            <span>{artist.bookingPreference ? BOOKING_LABELS[artist.bookingPreference] : "Not set"}</span>
                        </Row>
                        <Row label="Travel Frequency:">
                            <span>{artist.travelFrequency ? TRAVEL_LABELS[artist.travelFrequency] : "Not set"}</span>
                        </Row>
                        <Row label="Styles:">
                            <InlineWrapBadges items={artist.styles} />
                        </Row>
                    </div>
                </section>
            )}
        </div>
    );
}