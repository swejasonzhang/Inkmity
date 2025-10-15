import React, { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import BookingPicker from "../../calender/BookingPicker";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const prefersReducedMotion = useReducedMotion();

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

    const handleNext = () => onGoToStep?.(2);

    return (
        <div className="w-full mt-5" style={{ background: "var(--card)", color: "var(--fg)" }}>
            <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
                    <div className="py-3 sm:py-4">
                        <div className="mx-auto w-full max-w-3xl flex items-center justify-evenly gap-4 sm:gap-6 py-2 sm:py-3 px-2 sm:px-3">
                            <div className="justify-self-end">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {[0, 1, 2].map((i) => (
                                        <button
                                            key={i}
                                            onClick={() => onGoToStep?.(i as 0 | 1 | 2)}
                                            aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                                            className="h-2.5 w-6 rounded-full transition-all"
                                            style={{
                                                background:
                                                    i === 1
                                                        ? "color-mix(in oklab, var(--fg) 95%, transparent)"
                                                        : "color-mix(in oklab, var(--fg) 40%, transparent)"
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="justify-self-center">
                                <motion.div
                                    initial={{ y: 0, opacity: 0.95 }}
                                    animate={prefersReducedMotion ? {} : { y: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                                    className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium shadow-sm"
                                    style={{
                                        background: "color-mix(in oklab, var(--elevated) 92%, transparent)",
                                        color: "color-mix(in oklab, var(--fg) 90%, transparent)"
                                    }}
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    <span>Scroll to explore the message the artist and book an appointment</span>
                                </motion.div>
                                <div className="sm:hidden h-6" />
                            </div>

                            <div className="justify-self-start">
                                <div className="inline-flex items-center gap-2 sm:gap-3 flex-nowrap whitespace-nowrap">
                                    <Button
                                        onClick={onBack}
                                        className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                                        style={{
                                            background: "color-mix(in oklab, var(--elevated) 96%, transparent)",
                                            color: "var(--fg)"
                                        }}
                                        variant="outline"
                                    >
                                        Back: Portfolio
                                    </Button>

                                    <Button
                                        onClick={handleNext}
                                        className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm border-0"
                                        style={{
                                            background: "color-mix(in oklab, var(--elevated) 96%, transparent)",
                                            color: "var(--fg)"
                                        }}
                                        variant="outline"
                                    >
                                        Next: Reviews
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-0 grid grid-cols-1 gap-6 lg:gap-8">
                {/* Message the artist - WITH BORDER */}
                <Card className="w-full shadow-none" style={{ border: "1px solid var(--border)" }}>
                    <CardHeader className="text-center space-y-1">
                        <CardTitle>Message {artist.username}</CardTitle>
                    </CardHeader>

                    <CardContent className="flex items-center justify-center">
                        <div className="w-full mx-auto flex flex-col items-center justify-center gap-4 sm:gap-6 px-4">
                            <p
                                className="px-4 py-2 rounded-md text-center w-full max-w-[28rem] text-[13px] sm:text-sm leading-5 sm:leading-6"
                                style={{ background: "var(--elevated)", color: "var(--fg)" }}
                            >
                                Send a quick intro. You can also ask questions about availability or designs.
                            </p>

                            <Button
                                onClick={handleSendMessage}
                                disabled={sentOnce}
                                className="transition w-full sm:w-auto border-0"
                                style={{ background: "var(--elevated)", color: "var(--fg)" }}
                            >
                                {sentOnce ? "Message Sent" : "Send Message"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Book an appointment - WITH BORDER */}
                <Card className="w-full shadow-none" style={{ border: "1px solid var(--border)" }}>
                    <CardHeader className="text-center space-y-1">
                        <CardTitle>Book an appointment</CardTitle>
                    </CardHeader>

                    <CardContent className="p-3 sm:p-5">
                        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
                            <div
                                className="flex flex-col h-full min-h-[640px] rounded-md"
                                style={{ background: "var(--elevated)" }}
                            >
                                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 p-3 sm:p-4">
                                    <Select
                                        value={String(month.getMonth())}
                                        onValueChange={(value) =>
                                            setMonth(new Date(month.getFullYear(), Number(value), 1))
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-9 w-40 border-0"
                                            style={{
                                                background: "var(--card)",
                                                color: "var(--fg)"
                                            }}
                                        >
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent
                                            className="border-0"
                                            style={{
                                                background: "var(--card)",
                                                color: "var(--fg)"
                                            }}
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
                                        onValueChange={(value) =>
                                            setMonth(new Date(Number(value), month.getMonth(), 1))
                                        }
                                    >
                                        <SelectTrigger
                                            className="h-9 w-28 border-0"
                                            style={{
                                                background: "var(--card)",
                                                color: "var(--fg)"
                                            }}
                                        >
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent
                                            className="border-0"
                                            style={{
                                                background: "var(--card)",
                                                color: "var(--fg)"
                                            }}
                                        >
                                            {years.map((y) => (
                                                <SelectItem key={y} value={String(y)}>
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-1 px-3 sm:px-4 pb-4 sm:pb-5">
                                    <div className="w-full text-center mb-2">
                                        <span
                                            style={{ color: "color-mix(in oklab, var(--fg) 70%, transparent)" }}
                                        >
                                            Selected:{" "}
                                        </span>
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
                                            selected: "ring-2 !ring-offset-0 !bg-transparent !shadow-none"
                                        }}
                                        classNames={{
                                            day: "h-12 w-12 m-2 sm:m-2.5 p-0 font-normal rounded-md outline-none focus:outline-none",
                                        }}
                                        className="w-full rounded-md p-3 sm:p-4 mx-auto h-full border-0"
                                        style={{
                                            background: "var(--card)",
                                            color: "var(--fg)"
                                        }}
                                    />
                                </div>
                            </div>

                            <div
                                className="flex flex-col h-full min-h-[640px] rounded-md"
                                style={{ background: "var(--elevated)" }}
                            >
                                <div className="flex-1 p-3 sm:p-4 lg:p-5">
                                    <div className="w-full h-full max-w-[920px] mx-auto">
                                        <BookingPicker artistId={artist._id} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default ArtistBooking;