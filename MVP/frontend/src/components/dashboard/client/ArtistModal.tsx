import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import ArtistPortfolio, { ArtistWithGroups } from "./ArtistPortfolio";
import ArtistBooking from "./ArtistBooking";
import ArtistReviews from "./ArtistReviews";
import StepBarRow from "./StepBarRow";
import "@/styles/artist-modal.css";

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
  initialStep?: 0 | 1 | 2;
};

const ArtistModal: React.FC<Props> = ({ open, onClose, artist, onMessage, initialStep = 0 }) => {
  const [step, setStep] = useState<0 | 1 | 2>(initialStep);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const scrollYRef = useRef<number>(0);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep, open]);

  const markJustClosed = () => {
    window.__INK_MODAL_JUST_CLOSED_AT__ = Date.now();
  };

  const closeNow = () => {
    markJustClosed();
    if (portalRef.current) {
      const portal = portalRef.current;
      portal.style.pointerEvents = "none";
      portal.style.opacity = "0";
      portal.style.visibility = "hidden";
      portal.style.display = "none";
      portalRef.current = null;
      if (portal.parentNode) {
        try {
          document.body.removeChild(portal);
        } catch {}
      }
    }
    const existingPortal = document.getElementById("inkmity-modal-root");
    if (existingPortal && existingPortal.parentNode) {
      try {
        existingPortal.style.pointerEvents = "none";
        existingPortal.style.display = "none";
        document.body.removeChild(existingPortal);
      } catch {}
    }
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setMounted(false);
      if (portalRef.current) {
        const portal = portalRef.current;
        portal.style.pointerEvents = "none";
        portal.style.opacity = "0";
        portal.style.visibility = "hidden";
        portal.style.display = "none";
        portalRef.current = null;
        if (portal.parentNode) {
          try {
            document.body.removeChild(portal);
          } catch {}
        }
      }
      return;
    }

    if (!portalRef.current) {
      const getThemedAncestor = () => {
        return document.getElementById("dashboard-scope") || 
               document.getElementById("ink-root") || 
               document.querySelector<HTMLElement>(".ink-scope") ||
               document.documentElement;
      };
      
      const themeVars = [
        "--background",
        "--foreground",
        "--card",
        "--card-h",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted2",
        "--muted-foreground",
        "--accent",
        "--accent-h",
        "--accent-foreground",
        "--border",
        "--border-h",
        "--input",
        "--ring",
        "--bg",
        "--fg",
        "--subtle",
        "--elevated",
        "--danger",
        "--danger-foreground",
      ];
      
      const waitForTheme = (callback: () => void) => {
        const check = () => {
          const themedAncestor = getThemedAncestor();
          if (!themedAncestor) {
            requestAnimationFrame(check);
            return;
          }
          
          const hasThemeAttr = themedAncestor.getAttribute("data-ink");
          const hasThemeClass = themedAncestor.classList.contains("ink-light");
          const cs = getComputedStyle(themedAncestor);
          const hasBg = cs.getPropertyValue("--bg").trim();
          const hasCard = cs.getPropertyValue("--card").trim();
          
          if ((hasThemeAttr || hasThemeClass) && hasBg && hasCard) {
            callback();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      };
      
      waitForTheme(() => {
        const themedAncestor = getThemedAncestor();
        if (!themedAncestor) {
          setMounted(false);
          return;
        }
        
        const isLight = themedAncestor.classList.contains("ink-light") || themedAncestor.getAttribute("data-ink") === "light";
        const cs = getComputedStyle(themedAncestor);
        
        const el = document.createElement("div");
        el.id = "inkmity-modal-root";
        el.style.position = "fixed";
        el.style.inset = "0";
        el.style.zIndex = "1200";
        el.style.isolation = "isolate";
        el.style.transition = "none";
        el.style.animation = "none";
        el.style.background = "transparent";
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        el.style.pointerEvents = "none";
        el.classList.add("ink-scope", "ink-no-anim");
        el.setAttribute("data-ink-no-anim-permanent", "true");
        el.setAttribute("data-ink-modal-portal", "true");
        
        if (isLight) {
          el.classList.add("ink-light");
          el.setAttribute("data-ink", "light");
        } else {
          el.setAttribute("data-ink", "dark");
        }
        
        themeVars.forEach((v) => {
          const val = cs.getPropertyValue(v).trim();
          if (val) {
            el.style.setProperty(v, val);
          }
        });
        el.style.setProperty("--danger", cs.getPropertyValue("--danger") || cs.getPropertyValue("--destructive") || "");
        el.style.setProperty("--danger-foreground", cs.getPropertyValue("--danger-foreground") || cs.getPropertyValue("--destructive-foreground") || "");
        
        portalRef.current = el;
      
        const syncTheme = () => {
          const themedAncestor = getThemedAncestor();
          if (!themedAncestor) return;
          
          const isLight = themedAncestor.classList.contains("ink-light") || 
                         themedAncestor.getAttribute("data-ink") === "light";
          
          if (isLight) {
            el.classList.add("ink-light");
            el.setAttribute("data-ink", "light");
          } else {
            el.classList.remove("ink-light");
            el.setAttribute("data-ink", "dark");
          }
          
          const cs = getComputedStyle(themedAncestor);
          themeVars.forEach((v) => {
            const val = cs.getPropertyValue(v).trim();
            if (val) {
              el.style.setProperty(v, val);
            }
          });
          
          el.style.setProperty("--danger", cs.getPropertyValue("--danger") || cs.getPropertyValue("--destructive") || "");
          el.style.setProperty("--danger-foreground", cs.getPropertyValue("--danger-foreground") || cs.getPropertyValue("--destructive-foreground") || "");
        };
        
        const forceNoAnim = () => {
          if (portalRef.current && !portalRef.current.classList.contains('ink-no-anim')) {
            portalRef.current.classList.add('ink-no-anim');
          }
        };
        
        const portalObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              forceNoAnim();
            }
          });
          forceNoAnim();
        });
        
        const themeObserver = new MutationObserver(() => {
          syncTheme();
        });
        
        const ancestorForObserver = getThemedAncestor();
        if (ancestorForObserver) {
          themeObserver.observe(ancestorForObserver, { 
            attributes: true, 
            attributeFilter: ['class', 'data-ink', 'style'] 
          });
        }
      
        const handleThemeChange = () => {
          syncTheme();
        };
        window.addEventListener("ink:theme-change", handleThemeChange);
        window.addEventListener("storage", handleThemeChange);
        
        document.body.appendChild(el);
        portalObserver.observe(el, { attributes: true, attributeFilter: ['class'], subtree: true });
        
        const intervalId = setInterval(forceNoAnim, 50);
        
        syncTheme();
        const checkAndShow = () => {
          if (!portalRef.current) return;
          const portalCs = getComputedStyle(portalRef.current);
          const bgVal = portalCs.getPropertyValue("--bg").trim();
          const cardVal = portalCs.getPropertyValue("--card").trim();
          const fgVal = portalCs.getPropertyValue("--fg").trim();
          
          if (bgVal && cardVal && fgVal) {
            syncTheme();
            requestAnimationFrame(() => {
              syncTheme();
              if (portalRef.current) {
                portalRef.current.style.opacity = "1";
                portalRef.current.style.visibility = "visible";
                portalRef.current.style.pointerEvents = "auto";
              }
              setMounted(true);
              setTimeout(() => clearInterval(intervalId), 2000);
            });
          } else {
            requestAnimationFrame(checkAndShow);
          }
        };
        
        requestAnimationFrame(checkAndShow);
        
        return () => {
          portalObserver.disconnect();
          themeObserver.disconnect();
          window.removeEventListener("ink:theme-change", handleThemeChange);
          window.removeEventListener("storage", handleThemeChange);
          clearInterval(intervalId);
          if (portalRef.current) {
            const portal = portalRef.current;
            portal.style.pointerEvents = "none";
            portal.style.opacity = "0";
            portal.style.visibility = "hidden";
            portal.style.display = "none";
            portalRef.current = null;
            if (portal.parentNode) {
              try {
                document.body.removeChild(portal);
              } catch {}
            }
          }
          setMounted(false);
        };
      });
    } else if (portalRef.current) {
      const getThemedAncestor = () => {
        return document.getElementById("dashboard-scope") || 
               document.getElementById("ink-root") || 
               document.querySelector<HTMLElement>(".ink-scope") ||
               document.documentElement;
      };
      
      const themeVars = [
        "--background",
        "--foreground",
        "--card",
        "--card-h",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted2",
        "--muted-foreground",
        "--accent",
        "--accent-h",
        "--accent-foreground",
        "--border",
        "--border-h",
        "--input",
        "--ring",
        "--bg",
        "--fg",
        "--subtle",
        "--elevated",
        "--danger",
        "--danger-foreground",
      ];
      
      const syncTheme = () => {
        if (!portalRef.current) return;
        const themedAncestor = getThemedAncestor();
        if (!themedAncestor) return;
        
        const isLight = themedAncestor.classList.contains("ink-light") || 
                       themedAncestor.getAttribute("data-ink") === "light";
        
        if (isLight) {
          portalRef.current.classList.add("ink-light");
          portalRef.current.setAttribute("data-ink", "light");
        } else {
          portalRef.current.classList.remove("ink-light");
          portalRef.current.setAttribute("data-ink", "dark");
        }
        
        const cs = getComputedStyle(themedAncestor);
        themeVars.forEach((v) => {
          const val = cs.getPropertyValue(v).trim();
          if (val && portalRef.current) {
            portalRef.current.style.setProperty(v, val);
          }
        });
        
        if (portalRef.current) {
          portalRef.current.style.setProperty("--danger", cs.getPropertyValue("--danger") || cs.getPropertyValue("--destructive") || "");
          portalRef.current.style.setProperty("--danger-foreground", cs.getPropertyValue("--danger-foreground") || cs.getPropertyValue("--destructive-foreground") || "");
        }
      };
      
      syncTheme();
      requestAnimationFrame(() => {
        syncTheme();
        setMounted(true);
      });
      
      return () => {
        setMounted(false);
      };
    }
  }, [open]);

  const isNestedDialogOpen = () => !!document.querySelector('[data-radix-dialog-content][data-state="open"]');

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (isNestedDialogOpen()) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      closeNow();
    };
    if (open) window.addEventListener("keydown", onEsc, true);
    return () => window.removeEventListener("keydown", onEsc, true);
  }, [open]);

  useEffect(() => {
    if (!open) {
      const restoreBody = () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
        (document.documentElement as HTMLElement).style.overscrollBehavior = "";
        document.body.style.overscrollBehavior = "";
      };
      restoreBody();
      requestAnimationFrame(restoreBody);
      return;
    }
    setStep(initialStep);
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
  }, [open, initialStep]);

  if (!open) {
    if (portalRef.current) {
      const portal = portalRef.current;
      portal.style.pointerEvents = "none";
      portal.style.opacity = "0";
      portal.style.visibility = "hidden";
      portal.style.display = "none";
      portalRef.current = null;
      if (portal.parentNode) {
        try {
          document.body.removeChild(portal);
        } catch {}
      }
    }
    return null;
  }
  
  if (!mounted || !portalRef.current) return null;

  const handleOverlayPointerDown: React.PointerEventHandler<HTMLDivElement> = e => {
    if (isNestedDialogOpen()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const panel = panelRef.current;
    const target = e.target as Node;
    if (panel && panel.contains(target)) {
      return;
    }
    if ((e.target as HTMLElement)?.closest('[data-radix-dialog-content]')) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    closeNow();
  };

  const handleClosePointerDown: React.PointerEventHandler = e => {
    e.stopPropagation();
    e.preventDefault();
    closeNow();
  };

  const stepMeta =
    step === 0
      ? { active: 0 as 0 | 1 | 2, rightLabel: "Next: Booking & Message", onRight: () => { setStep(1); }, centerHint: "Scroll to explore the portfolio" }
      : step === 1
        ? { active: 1 as 0 | 1 | 2, rightLabel: "Next: Reviews", onRight: () => { setStep(2); }, centerHint: "Scroll to message and book" }
        : { active: 2 as 0 | 1 | 2, rightLabel: "Back: Booking & Message", onRight: () => { setStep(1); }, centerHint: "Scroll to browse reviews or change the sort" };

  if (!mounted) {
    return null;
  }

  const modalUI = (
    <div
      ref={overlayRef}
      key={artist._id}
      className="fixed inset-0 flex items-center justify-center ink-no-anim"
      style={{ 
        background: "color-mix(in oklab, var(--bg) 30%, transparent)", 
        overscrollBehavior: "contain",
        transition: "none !important",
        animation: "none !important"
      } as React.CSSProperties}
      aria-modal="true"
      role="dialog"
      onPointerDown={handleOverlayPointerDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeNow();
        }
      }}
    >
      <div className="pointer-events-none w-full h-full flex items-center justify-center">
        <ScrollArea
          ref={panelRef as any}
          className="pointer-events-auto w-[96vw] max-w-[1400px] h-[86vh] max-h-[900px] rounded-2xl shadow-2xl border flex flex-col items-center text-center ink-no-anim"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ 
            background: "var(--card)", 
            borderColor: "var(--border)", 
            color: "var(--fg)",
            transition: "none !important",
            animation: "none !important",
            opacity: 1,
            visibility: "visible"
          } as React.CSSProperties}
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

          <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-background/70" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6">
              <div className="py-2 sm:py-3">
                <div className="mx-auto w-full max-w-3xl px-2 sm:px-3">
                  <StepBarRow active={stepMeta.active} onGoToStep={(s: 0 | 1 | 2) => { setStep(s); }} rightLabel={stepMeta.rightLabel} onRightClick={stepMeta.onRight} centerHint={stepMeta.centerHint} />
                </div>
              </div>
            </div>
          </div>

          <div 
            className="w-full max-w-[1200px] mx-auto ink-no-anim" 
            style={{ 
              transition: "none !important",
              animation: "none !important",
              opacity: 1,
              visibility: "visible"
            } as React.CSSProperties}
          >
            {step === 0 && <ArtistPortfolio artist={artist} />}
            {step === 1 && (
              <ArtistBooking
                artist={artist}
                onBack={() => { setStep(0); }}
                onClose={onClose}
                onGoToStep={s => { setStep(s); }}
                onMessage={onMessage}
              />
            )}
            {step === 2 && <ArtistReviews artist={artist} />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalUI, portalRef.current);
};

export default ArtistModal;