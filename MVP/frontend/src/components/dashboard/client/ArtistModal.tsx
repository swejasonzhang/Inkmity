import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ArtistPortfolio, { ArtistWithGroups } from "./ArtistPortfolio";
import ArtistBookingComponent from "./ArtistBooking";
import ArtistReviews from "./ArtistReviews";

declare global {
  interface Window {
    __INK_MODAL_JUST_CLOSED_AT__?: number;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  artist: ArtistWithGroups;
  onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
};

type BookingProps = {
  artist: ArtistWithGroups;
  onMessage: (artist: ArtistWithGroups, preloadedMessage: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  onGoToStep?: (step: 0 | 1 | 2) => void;
};

const ArtistBooking = ArtistBookingComponent as React.ComponentType<BookingProps>;

const THEME_CLASS_CANDIDATES = [
  ".dashboard-theme",
  ".ink-light",
  ".ink-dark",
  ".ink-theme",
  ".dark",
  "[data-theme]",
  "body",
  "html",
];

function findThemeRoot(): HTMLElement {
  for (const sel of THEME_CLASS_CANDIDATES) {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) return el;
  }
  return document.documentElement;
}

function extractThemeClasses(el: HTMLElement): string[] {
  const classes = Array.from(el.classList || []);
  const keep = ["dashboard-theme", "ink-light", "ink-dark", "ink-theme", "dark"];
  return classes.filter((c) => keep.includes(c));
}

function copyCSSVariables(fromEl: HTMLElement, toEl: HTMLElement) {
  const style = getComputedStyle(fromEl);
  const vars: Record<string, string> = {};
  for (let i = 0; i < style.length; i++) {
    const prop = style.item(i);
    if (prop.startsWith("--")) {
      vars[prop] = style.getPropertyValue(prop);
    }
  }
  for (const [k, v] of Object.entries(vars)) {
    toEl.style.setProperty(k, v);
  }
}

export default function ArtistModal({ open, onClose, artist, onMessage }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const scrollYRef = useRef<number>(0);
  const observerRef = useRef<MutationObserver | null>(null);

  const swallowGestureTail = () => {
    const handler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      (e as any).stopImmediatePropagation?.();
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("pointerup", handler, true);
    document.addEventListener("mouseup", handler, true);
    document.addEventListener("touchend", handler, true);
    setTimeout(() => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("pointerup", handler, true);
      document.removeEventListener("mouseup", handler, true);
      document.removeEventListener("touchend", handler, true);
    }, 300);
  };

  const markJustClosed = () => {
    window.__INK_MODAL_JUST_CLOSED_AT__ = Date.now();
  };

  const closeNow = () => {
    swallowGestureTail();
    markJustClosed();
    onClose();
  };

  function syncThemeToPortal() {
    if (!portalRef.current) return;
    const root = findThemeRoot();
    portalRef.current.className = "";
    const themeClasses = extractThemeClasses(root);
    if (themeClasses.length) portalRef.current.classList.add(...themeClasses);
    const dataTheme = root.getAttribute("data-theme");
    if (dataTheme) portalRef.current.setAttribute("data-theme", dataTheme);
    copyCSSVariables(root as HTMLElement, portalRef.current);
  }

  useEffect(() => {
    if (!portalRef.current) {
      const el = document.createElement("div");
      el.id = "inkmity-modal-root";
      el.style.position = "fixed";
      el.style.inset = "0";
      el.style.zIndex = "1200";
      el.style.isolation = "isolate";
      portalRef.current = el;
      document.body.appendChild(el);
    }
    syncThemeToPortal();

    const root = findThemeRoot();
    observerRef.current = new MutationObserver(() => syncThemeToPortal());
    observerRef.current.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
      subtree: false,
    });

    setMounted(true);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNow();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      (document.documentElement as HTMLElement).style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
      return;
    }
    setStep(0);
    scrollYRef.current = window.scrollY || window.pageYOffset || 0;
    (document.documentElement as HTMLElement).style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const preventScrollChain = (e: Event) => e.preventDefault();
    overlayRef.current?.addEventListener("wheel", preventScrollChain, { passive: false });
    overlayRef.current?.addEventListener("touchmove", preventScrollChain, { passive: false });
    return () => {
      overlayRef.current?.removeEventListener("wheel", preventScrollChain as EventListener);
      overlayRef.current?.removeEventListener("touchmove", preventScrollChain as EventListener);
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      (document.documentElement as HTMLElement).style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
      window.scrollTo(0, scrollYRef.current || 0);
    };
  }, [open]);

  if (!open || !mounted || !portalRef.current) return null;

  const handleOverlayPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const panel = panelRef.current;
    if (!panel || panel.contains(e.target as Node)) return;
    (e as any).nativeEvent?.stopImmediatePropagation?.();
    e.stopPropagation();
    e.preventDefault();
    closeNow();
  };

  const handleClosePointerDown: React.PointerEventHandler = (e) => {
    (e as any).nativeEvent?.stopImmediatePropagation?.();
    e.stopPropagation();
    e.preventDefault();
    closeNow();
  };

  const modalUI = (
    <motion.div
      ref={overlayRef}
      key={artist._id}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "color-mix(in oklab, var(--bg) 30%, transparent)", overscrollBehavior: "contain" } as React.CSSProperties}
      aria-modal="true"
      role="dialog"
      onPointerDown={handleOverlayPointerDown}
    >
      <div className="pointer-events-none w-full h-full flex items-center justify-center">
        <ScrollArea
          ref={panelRef as any}
          className="pointer-events-auto w-[96vw] max-w-[1400px] h-[86vh] max-h-[900px] rounded-2xl shadow-2xl border flex flex-col items-center text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
        >
          <div className="w-full max-w-[1100px] mx-auto px-6 pt-5 relative flex flex-col items-center">
            <h2 className="text-2xl font-extrabold">{artist.username}</h2>
            <button
              onPointerDown={handleClosePointerDown}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full p-2 hover:opacity-80"
              style={{ color: "var(--fg)" }}
            >
              <X className="h-5 w-5" />
            </button>
            <Separator className="mt-4 w-full" style={{ background: "color-mix(in oklab, var(--fg) 18%, transparent)" }} />
          </div>

          <div className="w-full max-w-[1200px] mx-auto">
            {step === 0 && (
              <ArtistPortfolio
                artist={artist}
                onNext={() => setStep(1)}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={closeNow}
              />
            )}
            {step === 1 && (
              <ArtistBooking
                artist={artist}
                onMessage={onMessage}
                onBack={() => setStep(0)}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={closeNow}
              />
            )}
            {step === 2 && (
              <ArtistReviews
                artist={artist}
                onGoToStep={(s) => setStep(s as 0 | 1 | 2)}
                onClose={closeNow}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );

  return ReactDOM.createPortal(modalUI, portalRef.current);
}