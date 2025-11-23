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

  const pad = {
    left: isMdUp ? "calc(25px + env(safe-area-inset-left, 0px))" : "calc(13px + env(safe-area-inset-left, 0px))",
    right: isMdUp ? "calc(25px + env(safe-area-inset-right, 0px))" : "calc(13px + env(safe-area-inset-right, 0px))",
    bottom: `calc(max(${vvBottom}px, ${isMdUp ? 20 : 8}px) + env(safe-area-inset-bottom, 0px))`,
  };

  const btnCommon = "inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto transition focus:outline-none font-semibold border-2";
  const collapsedHeight = isMdUp ? 44 : 36;
  const assistantBtnClass = [
    "ink-assistant-btn",
    "px-3 md:px-4",
    "bg-app text-[color:var(--fg)] border-app shadow-lg",
    "focus:ring-2 focus:ring-app/50 focus:ring-offset-2 focus:ring-offset-[color:var(--bg)]",
    "hover:brightness-[1.08] active:scale-[0.99]",
    "disabled:opacity-100 disabled:bg-app disabled:text-[color:var(--fg)]",
    btnCommon
  ].join(" ");

  const MOBILE_CLOSED_W = 112;
  const MOBILE_OPEN_W = isMdUp ? Math.min(Math.max(240, vp.w - 48), 360) : vp.w;
  const MOBILE_HEADER_PADDING = 16;
  const MOBILE_OPEN_H = isMdUp ? Math.min(Math.max(300, vp.h - 180), 480) : vp.h - 96 - MOBILE_HEADER_PADDING;

  const PANEL_W = 320;
  const DESKTOP_OPEN_W = 1200;
  const DESKTOP_CLOSED_W = 160;

  const convW = isMdUp ? (open ? DESKTOP_OPEN_W + (role === "Artist" ? PANEL_W : 0) : DESKTOP_CLOSED_W) : (open ? MOBILE_OPEN_W : MOBILE_CLOSED_W);
  const convH = isMdUp ? (open ? 860 : collapsedHeight) : (open ? MOBILE_OPEN_H : collapsedHeight);

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
  }, [rightContent, isMdUp]);

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
      className="fixed inset-x-0 pointer-events-none z-[200]"
      style={{
        bottom: pad.bottom,
        zIndex: !isMdUp && open ? 9999 : 200
      }}
    >
        <style>{`
          .ink-assistant-btn[aria-disabled="true"] { opacity: 1; }
          .ink-assistant-btn { backdrop-filter: none; }
          .ink-solid-controls :is(button, [role="button"], .btn),
          .ink-solid-controls :is(nav button, nav a),
          .ink-solid-controls [data-pagination] :is(button, a) {
            background: var(--card);
            color: var(--fg);
            border: 1px solid var(--app, var(--border));
            font-weight: 600;
            border-radius: 9999px;
          }
          .ink-solid-controls :is(button, [role="button"], .btn) { padding: 0.5rem 0.75rem; }
        `}</style>
        <div className={`relative w-full ${isMdUp ? "px-4" : ""}`} style={{ height: Math.max(wrapperH, collapsedHeight) }}>
          <div className="grid items-center justify-items-center gap-4" style={{ gridTemplateColumns: "auto 1fr auto" }}>
            <Button
              type="button"
              onClick={assistantLocked ? undefined : onAssistantOpen}
              className={`${assistantBtnClass} pointer-events-auto ml-2`}
              aria-label={assistantLocked ? "Assistant locked" : "Open assistant"}
              aria-disabled={assistantLocked}
              disabled={assistantLocked}
              title={assistantLocked ? "Assistant is temporarily locked" : "Open assistant"}
              style={{
                height: collapsedHeight,
                boxShadow: "0 0 0 1px var(--bg) inset, 0 10px 28px rgba(0,0,0,0.35), 0 0 0 2px color-mix(in oklab, var(--app) 70%, transparent)"
              }}
              variant="outline"
            >
              <Bot size={18} aria-hidden />
              <span className="text-sm hidden md:inline">Assistant</span>
              {assistantLocked && (
                <>
                  <span className="hidden md:inline-block ml-1 opacity-90">
                    <Lock size={14} aria-hidden />
                  </span>
                  <span className="md:hidden ml-1">
                    <Lock size={14} aria-hidden />
                  </span>
                </>
              )}
            </Button>
            <div
              ref={centerRef}
              className="ink-solid-controls flex items-center justify-center pointer-events-auto"
              style={{
                opacity: !isMdUp && open ? 0 : 1,
                visibility: !isMdUp && open ? "hidden" : "visible"
              }}
            >
              {rightContent}
            </div>
            <div
              ref={btnRef}
              className={`ink-solid-controls flex items-center justify-center pointer-events-auto ${!isMdUp && open ? "fixed inset-0 z-[9999]" : ""}`}
              style={{
                ...(isMdUp ? {
                  position: "relative",
                  height: collapsedHeight,
                } : open ? {
                  width: vp.w,
                  height: MOBILE_OPEN_H,
                  top: 96 + MOBILE_HEADER_PADDING,
                } : {
                  position: "relative",
                  height: collapsedHeight,
                }),
                ...(!isMdUp && open ? {} : {
                  width: isMdUp ? convW : Math.max(0, convW - 50),
                  height: isMdUp ? convH : convH,
                })
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
        </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(ui, targetEl);
}