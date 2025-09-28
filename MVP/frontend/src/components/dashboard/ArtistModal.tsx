import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BookingPicker from "../calender/BookingPicker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Artist {
  _id: string;
  clerkId?: string;
  username: string;
  bio?: string;
}

interface ArtistModalProps {
  artist: Artist;
  onClose: () => void;
  onMessage: (artist: Artist, preloadedMessage: string) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ArtistModal: React.FC<ArtistModalProps> = ({
  artist,
  onClose,
  onMessage,
}) => {
  const preloadedMessage = `Hi ${artist.username}, I've taken a look at your work and I'm interested!
Would you be open to my ideas?`;

  const [sentOnce, setSentOnce] = useState(false);
  const sentRef = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [date, setDate] = useState<Date | undefined>(startOfToday);
  const [month, setMonth] = useState<Date>(startOfToday);

  const fromYear = startOfToday.getFullYear();
  const toYear = fromYear + 5;
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i
  );

  const handleSendMessage = () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSentOnce(true);
    onMessage(artist, preloadedMessage);
    onClose();
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <motion.div
      key={artist._id}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <ScrollArea
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[92vw] max-w-[1200px] h-[86vh] max-h-[900px] rounded-2xl bg-black text-white shadow-2xl border border-white flex flex-col"
      >
        <Separator className="bg-white/20" />
        <div className="p-6 space-y-8 text-center flex flex-col items-center">
          <section className="space-y-3 w-full max-w-2xl">
            <h3 className="text-xl font-semibold">About {artist.username}</h3>
            <p className="text-white/90">{artist.bio || "No bio available"}</p>
          </section>

          <Separator className="bg-white/10 w-full max-w-4xl" />

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl items-stretch auto-rows-fr">
            <div className="flex flex-col gap-6 items-center">
              <Card className="bg-black border-white/20 w-full flex flex-col">
                <CardHeader className="text-center">
                  <CardTitle className="text-white">Pick a date</CardTitle>
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
                      <SelectTrigger className="h-9 w-40 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
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
                      <SelectTrigger className="h-9 w-28 bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
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
                      selected:
                        "ring-2 ring-white border border-white !ring-offset-0 !bg-transparent !text-white !shadow-none",
                    }}
                    classNames={{
                      day: "h-12 w-12 m-1.5 p-0 font-normal rounded-md outline-none focus:outline-none focus-visible:outline-none",
                    }}
                    className={[
                      "w-full max-w-[920px] rounded-md bg-gray-900 text-white p-4",
                      "text-lg [--rdp-cell-size:80px] md:[--rdp-cell-size:88px]",
                      "transition-colors",
                    ].join(" ")}
                  />

                  <div className="w-full max-w-[920px] text-center mt-1">
                    <span className="text-xs text-white/70">Selected: </span>
                    <span className="text-white font-medium">
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

              <Card className="bg-black border-white/20 w-full">
                <CardHeader className="text-center">
                  <CardTitle className="text-white">
                    Message {artist.username}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="bg-black text-white/90 px-3 py-2 rounded-md text-center">
                    Send a quick intro. You can also ask questions about
                    availability or designs.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      onClick={handleSendMessage}
                      disabled={sentOnce}
                      className="bg-gray-800 hover:bg-gray-700 text-white disabled:bg-gray-700"
                    >
                      {sentOnce ? "Message Sent" : "Send Message"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <CardContent className="flex-1 flex flex-col items-center justify-center px-8">
              <BookingPicker artistId={artist._id} />
            </CardContent>
          </section>
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default ArtistModal;
