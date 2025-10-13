import React, { useMemo, useRef, useState } from "react";
import BookingPicker from "../../calender/BookingPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type ArtistWithGroups = {
    _id: string;
    clerkId?: string;
    username: string;
    bio?: string;
    pastWorks: string[];
    sketches?: string[];
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type BookingProps = {
    artist: ArtistWithGroups;
    onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
    onClose?: () => void;
};

const ArtistBooking: React.FC<BookingProps> = ({ artist, onMessage, onClose }) => {
    const preloadedMessage = useMemo(
        () =>
            `Hi ${artist.username}, I've taken a look at your work and I'm interested!
Would you be open to my ideas?`,
        [artist.username]
    );

    const [sentOnce, setSentOnce] = useState(false);
    const sentRef = useRef(false);

    const startOfToday = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const [date, setDate] = useState<Date | undefined>(startOfToday);
    const [month, setMonth] = useState<Date>(startOfToday);

    const fromYear = startOfToday.getFullYear();
    const toYear = fromYear + 5;
    const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i);

    const handleSendMessage = () => {
        if (sentRef.current) return;
        sentRef.current = true;
        setSentOnce(true);
        onMessage(artist, preloadedMessage);
        onClose?.();
    };

    return (
        <div
            className="p-6 space-y-10 flex flex-col items-center text-center"
            style={{ background: "var(--card)", color: "var(--fg)" }}
        >
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full max-w-6xl">
                <div className="flex flex-col gap-6 items-center w-full">
                    <Card
                        className="w-full max-w-[920px]"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
                    >
                        <CardHeader className="text-center">
                            <CardTitle>Pick a date</CardTitle>
                        </CardHeader>

                        <CardContent className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Select
                                    value={String(month.getMonth())}
                                    onValueChange={(value) => {
                                        const m = Number(value);
                                        setMonth(new Date(month.getFullYear(), m, 1));
                                    }}
                                >
                                    <SelectTrigger
                                        className="h-9 w-40"
                                        style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}
                                    >
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent
                                        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                                    >
                                        {MONTHS.map((m, i) => (
                                            <SelectItem key={m} value={String(i)}>
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={String(month.getFullYear())}
                                    onValueChange={(value) => {
                                        const y = Number(value);
                                        setMonth(new Date(y, month.getMonth(), 1));
                                    }}
                                >
                                    <SelectTrigger
                                        className="h-9 w-28"
                                        style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}
                                    >
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent
                                        style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                                    >
                                        {years.map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Calendar
                                mode="single"
                                month={month}
                                onMonthChange={setMonth}
                                selected={date}
                                required
                                onSelect={(d) => {
                                    if (!d) return;
                                    if (d < startOfToday) return;
                                    setDate(d);
                                }}
                                fromDate={startOfToday}
                                disabled={{ before: startOfToday }}
                                showOutsideDays={false}
                                modifiersClassNames={{
                                    selected: "ring-2 border !ring-offset-0 !bg-transparent !shadow-none",
                                }}
                                classNames={{
                                    day: "h-12 w-12 m-1.5 p-0 font-normal rounded-md outline-none focus:outline-none",
                                }}
                                className="w-full max-w-[920px] rounded-md p-4 mx-auto"
                                style={{
                                    background: "var(--elevated)",
                                    color: "var(--fg)",
                                    border: `1px solid var(--border)`,
                                }}
                            />

                            <div className="w-full max-w-[920px] text-center mt-1">
                                <span style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>Selected: </span>
                                <span className="font-medium" style={{ color: "var(--fg)" }}>
                                    {date
                                        ? date.toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                        : "—"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        className="w-full max-w-[920px]"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
                    >
                        <CardHeader className="text-center">
                            <CardTitle>Message {artist.username}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p
                                className="px-3 py-2 rounded-md text-center mx-auto max-w-prose"
                                style={{ background: "var(--elevated)", color: "var(--fg)" }}
                            >
                                Send a quick intro. You can also ask questions about availability or designs.
                            </p>
                            <div className="flex justify-center">
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={sentOnce}
                                    className="transition"
                                    style={{
                                        background: "var(--elevated)",
                                        color: "var(--fg)",
                                        border: `1px solid var(--border)`,
                                    }}
                                >
                                    {sentOnce ? "Message Sent" : "Send Message"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CardContent className="flex flex-col items-center justify-center px-8">
                    <div className="w-full max-w-[920px]">
                        <BookingPicker artistId={artist._id} />
                    </div>
                </CardContent>
            </section>
        </div>
    );
};

export default ArtistBooking;