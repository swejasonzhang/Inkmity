import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ArtistPortfolio, { ArtistWithGroups } from "./ArtistPortfolio";
import ArtistBooking from "./ArtistBooking";

type Props = {
  open: boolean;
  onClose: () => void;
  artist: ArtistWithGroups;
  onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
};

const ArtistModal: React.FC<Props> = ({ open, onClose, artist, onMessage }) => {
  const [step, setStep] = useState<0 | 1>(0);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  if (!open) return null;

  return (
    <motion.div
      key={artist._id}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[1200] flex items-center justify-center"
      style={{ background: "color-mix(in oklab, var(--bg) 30%, transparent)" }}
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <ScrollArea
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[96vw] max-w-[1400px] h-[86vh] max-h-[900px] rounded-2xl shadow-2xl border flex flex-col"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
      >
        <div className="px-6 pt-5 relative">
          <h2 className="text-2xl font-extrabold text-center">{artist.username}</h2>

          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 hover:opacity-80"
            style={{ color: "var(--fg)" }}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {[0, 1].map((i) => (
              <button
                key={i}
                onClick={() => setStep(i as 0 | 1)}
                aria-label={i === 0 ? "Portfolio" : "Booking & Message"}
                className={`h-2.5 w-2.5 rounded-full transition-transform ${step === i ? "scale-110" : "opacity-50 hover:opacity-80"
                  }`}
                style={{ background: "var(--fg)" }}
              />
            ))}
          </div>
        </div>

        <Separator
          className="mt-4"
          style={{ background: "color-mix(in oklab, var(--fg) 18%, transparent)" }}
        />

        {step === 0 ? (
          <ArtistPortfolio artist={artist} onNext={() => setStep(1)} />
        ) : (
          <ArtistBooking artist={artist} onMessage={onMessage} onClose={onClose} />
        )}
      </ScrollArea>
    </motion.div>
  );
};

export default ArtistModal;