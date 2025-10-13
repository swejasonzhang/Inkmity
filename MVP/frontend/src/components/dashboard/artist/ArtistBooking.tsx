import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import BookingPicker from "../../calender/BookingPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ArtistWithGroups } from "./ArtistPortfolio";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type BookingProps = {
    artist: ArtistWithGroups;
    onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
    onBack?: () => void;
    onClose?: () => void;
    onGoToStep?: (step: 0 | 1 | 2) => void;
};

const ArtistBooking: React.FC<BookingProps> = ({ artist, onMessage, onBack, onClose, onGoToStep }) => {
    const preloadedMessage = useMemo(
        () => `Hi ${artist.username}, I've taken a look at your work and I'm interested!
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
        <div className="w-full px-6 py-8 sm:py-10 space-y-8 flex flex-col items-center text-center" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 hover:opacity-80"
                style={{ color: "var(--fg)" }}
            >
                <X className="h-5 w-5" />
            </button>

            <motion.div
                initial={{ y: 0, opacity: 0.9 }}
                animate={{ y: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow-sm mb-3"
                style={{ background: "color-mix(in oklab, var(--elevated) 90%, transparent)", color: "color-mix(in oklab, var(--fg) 90%, transparent)", border: `1px solid var(--border)` }}
            >
                <ChevronDown className="h-4 w-4" />
                <span>Scroll down to see more</span>
            </motion.div>

            <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                        aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                        className={`h-2.5 w-2.5 rounded-full transition-transform ${i === 1 ? "scale-110" : "opacity-50 hover:opacity-80"}`}
                        style={{ background: "var(--fg)" }}
                    />
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                    onClick={onBack}
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    variant="outline"
                    style={{ background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)", border: `1px solid var(--border)` }}
                >
                    Back to Portfolio
                </Button>
            </div>

            <Separator className="w-full max-w-2xl" style={{ background: "color-mix(in oklab, var(--fg) 18%, transparent)" }} />

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center w-full max-w-6xl relative">
                <div className="flex flex-col gap-6 items-center w-full">
                    <Card className="w-full max-w-[920px]" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        <CardHeader className="text-center">
                            <CardTitle>Pick a date</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-3">
                            <div className="flex items-center justify-center gap-2">
                                <Select value={String(month.getMonth())} onValueChange={(value) => setMonth(new Date(month.getFullYear(), Number(value), 1))}>
                                    <SelectTrigger className="h-9 w-40" style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}>
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
                                        {MONTHS.map((m, i) => (
                                            <SelectItem key={m} value={String(i)}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={String(month.getFullYear())} onValueChange={(value) => setMonth(new Date(Number(value), month.getMonth(), 1))}>
                                    <SelectTrigger className="h-9 w-28" style={{ background: "var(--elevated)", borderColor: "var(--border)", color: "var(--fg)" }}>
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
                                        {years.map((y) => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
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
                                modifiersClassNames={{ selected: "ring-2 border !ring-offset-0 !bg-transparent !shadow-none" }}
                                classNames={{ day: "h-12 w-12 m-1.5 p-0 font-normal rounded-md outline-none focus:outline-none" }}
                                className="w-full max-w-[920px] rounded-md p-4 mx-auto"
                                style={{ background: "var(--elevated)", color: "var(--fg)", border: `1px solid var(--border)` }}
                            />

                            <div className="w-full max-w-[920px] text-center mt-1">
                                <span style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}>Selected: </span>
                                <span className="font-medium" style={{ color: "var(--fg)" }}>
                                    {date ? date.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : "—"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="w-full max-w-[920px]" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}>
                        <CardHeader className="text-center">
                            <CardTitle>Message {artist.username}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="px-3 py-2 rounded-md text-center mx-auto max-w-prose" style={{ background: "var(--elevated)", color: "var(--fg)" }}>
                                Send a quick intro. You can also ask questions about availability or designs.
                            </p>
                            <div className="flex justify-center">
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={sentOnce}
                                    className="transition"
                                    style={{ background: "var(--elevated)", color: "var(--fg)", border: `1px solid var(--border)` }}
                                >
                                    {sentOnce ? "Message Sent" : "Send Message"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CardContent className="flex flex-col items-center justify-center px-4 lg:px-8 w-full">
                    <div className="w-full max-w-[920px]">
                        <BookingPicker artistId={artist._id} />
                    </div>
                </CardContent>
            </section>
        </div>
    );
};

export default ArtistBooking;