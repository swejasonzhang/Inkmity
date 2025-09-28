import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BookingPicker from "../calender/BookingPicker";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

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

  const [date, setDate] = useState<Date | undefined>(new Date());

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
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="
          w-[92vw] max-w-[1200px]
          h-[86vh] max-h-[900px]
          rounded-2xl bg-gray-900 text-white shadow-2xl border border-white
          flex flex-col
        "
      >
        <Separator className="bg-white/20" />

        <ScrollArea className="flex-1 h-[calc(86vh-120px)] pr-2">
          <div className="p-6 space-y-8 text-center flex flex-col items-center">
            <section className="space-y-3 w-full max-w-2xl">
              <h3 className="text-xl font-semibold">About {artist.username}</h3>
              <p className="text-white/90">
                {artist.bio || "No bio available"}
              </p>
            </section>

            <Separator className="bg-white/10 w-full max-w-4xl" />

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl items-stretch auto-rows-fr">
              <Card className="bg-gray-900 border-white/20 w-full h-full flex flex-col">
                <CardHeader className="text-center">
                  <CardTitle className="text-white">Pick a date</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border border-white/10 bg-gray-900 text-white"
                  />
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-white/20 w-full h-full flex flex-col">
                <CardHeader className="text-center">
                  <CardTitle className="text-white">Available times</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center">
                  <div className="w-full max-w-sm">
                    <BookingPicker artistId={artist._id} />
                  </div>
                  <p className="mt-3 text-xs text-white/70">
                    After booking, the slot will disappear to prevent
                    double-booking.
                  </p>
                </CardContent>
              </Card>
            </section>

            <Separator className="bg-white/10 w-full max-w-4xl" />

            <section className="space-y-4 w-full max-w-2xl">
              <h3 className="text-xl font-semibold">
                Message {artist.username}
              </h3>
              <p className="text-white/90">
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
            </section>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
};

export default ArtistModal;
