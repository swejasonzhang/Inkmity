import { createPortal } from "react-dom";
import { Bot, Lock } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInkConversations } from "@/hooks/useInkConversations";
import { InkConversations } from "./messages/InkConversations";
import type { Role } from "@/hooks/useInkConversations";

type Props = {
  role: Role;
  onAssistantOpen: () => void;
  portalTarget?: Element | null;
  assistantLocked?: boolean;
  messagesContent?: React.ReactNode;
  unreadCount?: number;
  unreadMessagesTotal?: number;
  requestExists?: boolean;
  unreadConversationsCount?: number;
  pendingRequestsCount?: number;
  unreadConversationIds?: string[];
  pendingRequestIds?: string[];
  rightContent?: React.ReactNode;
};

export default function FloatingBar({
  role,
  onAssistantOpen,
  portalTarget,
  assistantLocked = true,
  messagesContent,
  unreadCount,
  unreadMessagesTotal,
  requestExists,
  unreadConversationsCount,
  pendingRequestsCount,
  unreadConversationIds,
  pendingRequestIds,
  rightContent,
}: Props) {
  const portalRootRef = useRef<HTMLElement | null>(null);
  const [isMdUp, setIsMdUp] = useState(false);
  const [vp, setVp] = useState({ w: 375, h: 667 });
  const [vvBottom, setVvBottom] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filterTop, setFilterTop] = useState(0);
  const [buttonBottom, setButtonBottom] = useState(0);
  const [mainTop, setMainTop] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMdUp(e.matches);
    setIsMdUp(mql.matches);
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
    else mql.addListener(onChange as any);
    return () => {
      if (typeof mql.removeEventListener === "function") mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange as any);
    };
  }, []);

  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;
    const onVV = () => setVvBottom(Math.max(0, (window.visualViewport?.height ?? vp.h) - window.innerHeight));
    window.visualViewport.addEventListener("resize", onVV);
    window.visualViewport.addEventListener("scroll", onVV);
    onVV();
    return () => {
      window.visualViewport?.removeEventListener("resize", onVV);
      window.visualViewport?.removeEventListener("scroll", onVV);
    };
  }, [vp.h]);

  useEffect(() => {
    const measureHeader = () => {
      const header = document.querySelector("header");
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
      const filter = document.querySelector("[data-artist-filter]") as HTMLElement | null;
      if (filter) {
        setFilterTop(Math.round(filter.getBoundingClientRect().top));
      }
      const mainEl = document.querySelector("main");
      if (mainEl) {
        const card = mainEl.querySelector('[data-slot="card"]') as HTMLElement | null;
        if (card) {
          setMainTop(card.getBoundingClientRect().top);
        } else {
          const padTop = parseFloat(getComputedStyle(mainEl).paddingTop) || 0;
          setMainTop(mainEl.getBoundingClientRect().top + padTop);
        }
      }
    };
    measureHeader();
    const ro = new ResizeObserver(measureHeader);
    const header = document.querySelector("header");
    if (header) {
      ro.observe(header);
    }
    const filterEl = document.querySelector("[data-artist-filter]");
    if (filterEl) {
      ro.observe(filterEl);
    }
    const mainObs = document.querySelector("main");
    if (mainObs) {
      ro.observe(mainObs);
    }
    window.addEventListener("resize", measureHeader);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureHeader);
    };
  }, []);

  const { btnRef, open, setOpen, unreadConvoCount, requestCount, derivedTotal } = useInkConversations({
    role,
    unreadCount,
    unreadMessagesTotal,
    requestExists,
    unreadConversationsCount,
    pendingRequestsCount,
    unreadConversationIds,
    pendingRequestIds,
  });

  useEffect(() => {
    const measureFilter = () => {
      const filter = document.querySelector("[data-artist-filter]") as HTMLElement | null;
      if (filter) setFilterTop(Math.round(filter.getBoundingClientRect().top));
    };
    measureFilter();
    const id = window.setTimeout(measureFilter, 120);
    return () => window.clearTimeout(id);
  }, [open, isMdUp, vp.h]);

  const pad = {
    left: "var(--ink-edge-l)",
    right: "var(--ink-edge-r)",
    bottom: `calc(max(${vvBottom}px, clamp(0.625rem, 1vh + 0.5vw, 1.25rem)) + env(safe-area-inset-bottom, 0px))`,
  };

  const btnCommon = "inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto transition focus:outline-none font-semibold border";
  const collapsedHeight = 44;
  const assistantBtnClass = [
    "ink-assistant-btn",
    "px-3 md:px-4",
    "bg-[color:var(--bg)] text-[color:var(--fg)] border-app shadow-lg",
    "focus:ring-2 focus:ring-app/50 focus:ring-offset-2 focus:ring-offset-[color:var(--bg)]",
    "hover:brightness-[1.08] active:scale-[0.99]",
    "disabled:opacity-100 disabled:bg-[color:var(--bg)] disabled:text-[color:var(--fg)]",
    btnCommon
  ].join(" ");

  const MOBILE_CLOSED_W = 112;
  const MOBILE_OPEN_W = isMdUp ? Math.min(Math.max(240, vp.w - 48), 360) : vp.w;
  const MOBILE_HEADER_HEIGHT = 96;
  const MOBILE_OPEN_H = isMdUp ? Math.min(Math.max(300, vp.h - 180), 480) : vp.h - (headerHeight || MOBILE_HEADER_HEIGHT);

  const PANEL_W = 280;
  const DESKTOP_OPEN_W = Math.floor(vp.w * 0.5);
  const DESKTOP_CLOSED_W = 160;
  const desktopOpenTop = filterTop > 0 ? filterTop : headerHeight;
  const bottomGapPx = Math.max(vvBottom, isMdUp ? 20 : 10);
  const DESKTOP_OPEN_TOP = mainTop > 0 ? mainTop : desktopOpenTop;
  const DESKTOP_OPEN_H = (buttonBottom > 0 ? buttonBottom : (vp.h - bottomGapPx)) - DESKTOP_OPEN_TOP;

  const convW = isMdUp ? (open ? DESKTOP_OPEN_W + PANEL_W : DESKTOP_CLOSED_W) : (open ? MOBILE_OPEN_W : MOBILE_CLOSED_W);
  const convH = isMdUp ? (open ? DESKTOP_OPEN_H : collapsedHeight) : (open ? MOBILE_OPEN_H : collapsedHeight);

  const centerRef = useRef<HTMLDivElement | null>(null);
  const [centerH, setCenterH] = useState(0);
  const measureCenter = () => {
    const el = centerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCenterH(Math.ceil(rect.height));
  };

  useLayoutEffect(() => {
    measureCenter();
    const id = window.setTimeout(measureCenter, 120);
    return () => window.clearTimeout(id);
  }, [rightContent, isMdUp, open, vp.h]);

  useEffect(() => {
    const ro = new ResizeObserver(() => measureCenter());
    if (centerRef.current) ro.observe(centerRef.current);
    const onWin = () => measureCenter();
    window.addEventListener("resize", onWin);
    window.addEventListener("orientationchange", onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      window.removeEventListener("orientationchange", onWin);
    };
  }, []);

  useLayoutEffect(() => {
    const measureMainTop = () => {
      const mainEl = document.querySelector("main");
      if (!mainEl) return;
      const card = mainEl.querySelector('[data-slot="card"]') as HTMLElement | null;
      if (card) {
        setMainTop(card.getBoundingClientRect().top);
      } else {
        const padTop = parseFloat(getComputedStyle(mainEl).paddingTop) || 0;
        setMainTop(mainEl.getBoundingClientRect().top + padTop);
      }
    };
    const measureButton = () => {
      if (open) return;
      const el = btnRef.current;
      if (el) setButtonBottom(el.getBoundingClientRect().bottom);
    };
    measureMainTop();
    measureButton();
    const id = window.setTimeout(() => {
      measureMainTop();
      measureButton();
    }, 120);
    return () => window.clearTimeout(id);
  }, [open, isMdUp, vp.h, vvBottom, centerH]);

  const wrapperH = Math.max(collapsedHeight, centerH || 0);

  useEffect(() => {
    const EXTRA_SAFE_GAP = 16;
    const host = portalRootRef.current;
    if (!host) return;
    host.style.setProperty("--fb-safe", `${collapsedHeight + EXTRA_SAFE_GAP}px`);
    return () => {
      host.style.removeProperty("--fb-safe");
    };
  }, [collapsedHeight]);

  const resolveTarget = (): HTMLElement => {
    if (portalTarget instanceof HTMLElement) return portalTarget as HTMLElement;
    const byId = document.getElementById("dashboard-portal-root") as HTMLElement | null;
    if (byId) return byId;
    const scope = document.getElementById("dashboard-scope") as HTMLElement | null;
    return scope ?? (document.body as HTMLElement);
  };
  const targetEl = resolveTarget();
  portalRootRef.current = targetEl;

  const ui = (
    <div
      className="fixed grid items-end"
      style={{
        left: pad.left,
        right: pad.right,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.2rem)",
        height: `${Math.max(wrapperH, collapsedHeight)}px`,
        gridTemplateColumns: "1fr auto 1fr",
        pointerEvents: "none",
        zIndex: !isMdUp && open ? 9999 : 200,
      }}
    >
      <style>{`
        .ink-assistant-btn[aria-disabled="true"] { opacity: 1; }
        .ink-assistant-btn { backdrop-filter: blur(12px); }
        .ink-solid-controls :is(button, [role="button"], .btn),
        .ink-solid-controls :is(nav button, nav a),
        .ink-solid-controls [data-pagination] :is(button, a) {
          background: var(--bg);
          color: var(--fg);
          border: 1px solid var(--border);
          font-weight: 600;
          border-radius: 9999px;
        }
        .ink-solid-controls :is(button, [role="button"], .btn) { padding: 0.5rem 0.75rem; }
      `}</style>

      {}
      <Button
        type="button"
        onClick={assistantLocked ? undefined : onAssistantOpen}
        className={`${assistantBtnClass} justify-self-start`}
        aria-label={assistantLocked ? "Assistant locked" : "Open assistant"}
        aria-disabled={assistantLocked}
        disabled={assistantLocked}
        title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
        style={{
          height: collapsedHeight,
          pointerEvents: "auto",
          boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
        }}
        variant="outline"
      >
        <Bot size={18} aria-hidden />
        <span className="text-sm hidden md:inline">Assistant</span>
        {assistantLocked && (
          <span className="ml-1 opacity-90">
            <Lock size={14} aria-hidden />
          </span>
        )}
      </Button>

      {}
      <div
        ref={centerRef}
        className="ink-solid-controls flex items-center justify-center justify-self-center"
        style={{
          paddingInline: 4,
          pointerEvents: rightContent && (!open || isMdUp) ? "auto" : "none",
          opacity: !isMdUp && open ? 0 : 1,
          visibility: !isMdUp && open ? "hidden" : "visible",
        }}
      >
        {rightContent}
      </div>

      {
}
      <div
        ref={btnRef}
        className="ink-solid-controls flex items-end justify-end justify-self-end"
        style={{
          pointerEvents: "auto",
          ...(open
            ? {
                position: "fixed",
                ...(isMdUp
                  ? { right: "var(--ink-edge-r)", top: DESKTOP_OPEN_TOP, width: convW, height: DESKTOP_OPEN_H }
                  : { right: 0, bottom: 0, width: "100vw", height: MOBILE_OPEN_H }),
                zIndex: !isMdUp ? 9999 : undefined,
              }
            : {
                width: isMdUp ? convW : Math.max(0, convW - 50),
                height: collapsedHeight,
              }),
        }}
      >
        <InkConversations
          role={role}
          isMdUp={isMdUp}
          width={isMdUp ? convW : (open ? vp.w : Math.max(0, convW - 50))}
          height={isMdUp ? convH : (open ? MOBILE_OPEN_H : convH)}
          open={open}
          setOpen={setOpen}
          unreadConvoCount={unreadConvoCount}
          requestCount={requestCount}
          derivedTotal={derivedTotal}
          messagesContent={messagesContent}
        />
      </div>
    </div>
  );

  if (typeof document === "undefined") return <div data-testid="floating-bar-placeholder" />;
  return createPortal(ui, targetEl);
}