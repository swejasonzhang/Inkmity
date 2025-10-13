import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ArtistPortfolio, { ArtistWithGroups } from "./ArtistPortfolio";
import ArtistBooking from "./ArtistBooking";
import ArtistReviews from "./ArtistReviews";

type Props = {
  open: boolean;
  onClose: () => void;
  artist: ArtistWithGroups;
  onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
};

const ArtistModal: React.FC<Props> = ({ open, onClose, artist, onMessage }) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!portalRef.current) {
      const el = document.createElement("div");
      el.id = "inkmity-modal-root";
      portalRef.current = el;
      document.body.appendChild(el);
    }
    setMounted(true);
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    setStep(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const node = contentRef.current;
      const target = e.target as Node | null;
      if (!node || !target) return;
      if (!node.contains(target)) onClose();
    };
    document.addEventListener("pointerdown", handler, { capture: true });
    return () => document.removeEventListener("pointerdown", handler as EventListener, { capture: true } as any);
  }, [open, onClose]);

  if (!open || !mounted || !portalRef.current) return null;

  const handleAnyCloseClickCapture = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const closer = target.closest<HTMLElement>('[aria-label="Close"], [data-close-modal="true"]');
    if (closer) {
      e.stopPropagation();
      onClose();
    }
  };

  const modalUI = (
    <motion.div
      key={artist._id}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 z-[1200] flex items-center justify-center"
      style={{ background: "color-mix(in oklab, var(--bg) 30%, transparent)" }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={contentRef}
        className="pointer-events-auto w-full flex items-center justify-center"
        onClickCapture={handleAnyCloseClickCapture}
      >
        <ScrollArea
          className="w-[96vw] max-w-[1400px] h-[86vh] max-h-[900px] rounded-2xl shadow-2xl border flex flex-col items-center text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
        >
          <div className="w-full max-w-[1100px] mx-auto px-6 pt-5 relative flex flex-col items-center">
            <h2 className="text-2xl font-extrabold">{artist.username}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 hover:opacity-80"
              style={{ color: "var(--fg)" }}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mt-4 flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setStep(i as 0 | 1 | 2)}
                  aria-label={i === 0 ? "Portfolio" : i === 1 ? "Booking & Message" : "Reviews"}
                  className={`h-2.5 w-2.5 rounded-full transition-transform ${step === i ? "scale-110" : "opacity-50 hover:opacity-80"}`}
                  style={{ background: "var(--fg)" }}
                />
              ))}
            </div>
            <Separator
              className="mt-4 w-full"
              style={{ background: "color-mix(in oklab, var(--fg) 18%, transparent)" }}
            />
          </div>

          <div className="w-full max-w-[1200px] mx-auto">
            {step === 0 && (
              <ArtistPortfolio
                artist={artist}
                onNext={() => setStep(1)}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={onClose}
              />
            )}
            {step === 1 && (
              <ArtistBooking
                artist={artist}
                onMessage={onMessage}
                onBack={() => setStep(0)}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={onClose}
              />
            )}
            {step === 2 && (
              <ArtistReviews
                artist={artist}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={onClose}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );

  return ReactDOM.createPortal(modalUI, portalRef.current);
};

export default ArtistModal;