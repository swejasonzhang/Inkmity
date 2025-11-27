import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, X } from "lucide-react";
import type { Role } from "@/hooks/useInkConversations";

type Props = {
  role: Role;
  isMdUp: boolean;
  width: number;
  height: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  unreadConvoCount: number;
  requestCount: number;
  derivedTotal: number;
  messagesContent?: React.ReactNode;
};

export const InkConversations: React.FC<Props> = ({
  role,
  isMdUp,
  width,
  height,
  open,
  setOpen,
  unreadConvoCount,
  requestCount,
  derivedTotal,
  messagesContent,
}) => {
  const wrapperWidth = !isMdUp && !open ? "auto" : width;
  const badgeH = isMdUp ? 22 : 16;
  const badgeMinW = badgeH;
  const badgePadX = isMdUp ? 6 : 4;
  const badgeFont = isMdUp ? 12 : 10;

  const buttonPadding = isMdUp ? "px-4" : "px-3";
  const btnCommon = "inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto transition focus:outline-none font-semibold border";
  const messagesBtnClass = [
    buttonPadding,
    "bg-app text-[color:var(--fg)] border-app shadow-lg",
    "focus:ring-2 focus:ring-app/50 focus:ring-offset-2 focus:ring-offset-[color:var(--bg)]",
    "hover:brightness-[1.08] active:scale-[0.99]",
    btnCommon
  ].join(" ");

  return (
    <div
      className={`ink-conv-scope bg-app text-app ${!isMdUp && open ? "flex w-full" : "inline-flex"} items-center justify-center ${open ? "rounded-2xl" : "rounded-full"} pointer-events-auto border border-app shadow-lg transition`}
      aria-label={open ? "Messages" : "Open messages"}
      aria-expanded={open}
      style={{
        willChange: "width,height",
        width: wrapperWidth as number | string,
        height,
        borderRadius: open ? 16 : 9999,
        transition:
          "width 900ms cubic-bezier(0.22,1,0.36,1), height 900ms cubic-bezier(0.22,1,0.36,1), border-radius 900ms ease, padding 700ms ease",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: open ? undefined : "0 0 0 1px var(--bg) inset, 0 10px 28px rgba(0,0,0,0.35), 0 0 0 2px color-mix(in oklab, var(--app) 70%, transparent)",
        ...(!isMdUp && open ? { maxWidth: "100%", minWidth: "100%" } : {})
      }}
    >
      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className={`${messagesBtnClass} h-full w-full leading-none text-center`}
          title="Open messages"
          aria-label="Open messages"
          variant="outline"
          style={{
            boxShadow: "0 0 0 1px var(--bg) inset, 0 10px 28px rgba(0,0,0,0.35), 0 0 0 2px color-mix(in oklab, var(--app) 70%, transparent)"
          }}
        >
          <MessageSquare size={18} className="shrink-0" />
          <span className="hidden md:inline text-sm leading-none whitespace-nowrap">Messages</span>
          {derivedTotal > 0 && (
            <span
              className="inline-grid place-items-center rounded-full ml-1"
              style={{
                height: badgeH,
                minWidth: badgeMinW,
                paddingInline: badgePadX,
                fontSize: badgeFont,
                lineHeight: 1,
                fontWeight: 800,
                background: "var(--fg)",
                color: "var(--bg)",
                border: "1px solid var(--border)",
                boxShadow: "0 0 0 1px var(--bg), 0 6px 16px rgba(0,0,0,0.35)"
              }}
              aria-hidden={false}
            >
              {derivedTotal > 99 ? "99+" : derivedTotal}
            </span>
          )}
        </Button>
      ) : (
        <div className="flex flex-col h-full w-full">
          <div 
            className={`flex items-center justify-between ${isMdUp ? "px-3 py-2" : "px-4 py-3"} border-b border-app/40`}
            style={!isMdUp ? { minHeight: "50px" } : undefined}
          >
            <div 
              className={`flex items-center gap-2 font-semibold ${!isMdUp ? "h-10" : ""}`}
              style={!isMdUp ? { minHeight: "40px" } : undefined}
            >
              <MessageSquare size={16} />
              <span className={isMdUp ? "" : "text-sm"}>Messages</span>
              <Badge
                className={`ml-2 ${isMdUp ? "text-[11px] px-2 h-[18px]" : "text-[10px] px-1.5 h-[16px]"} inline-flex items-center rounded-full`}
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                {unreadConvoCount} unread convos
              </Badge>
              {role === "Artist" && (
                <Badge
                  className={`ml-2 ${isMdUp ? "text-[11px] px-2 h-[18px]" : "text-[10px] px-1.5 h-[16px]"} inline-flex items-center rounded-full`}
                  style={{ background: "var(--fg)", color: "var(--bg)" }}
                >
                  {requestCount} {requestCount === 1 ? "request" : "requests"}
                </Badge>
              )}
            </div>
            <div className="shrink-0">
              <span className="sr-only">Close messages</span>
              <Button
                type="button"
                className={`p-1 rounded-full hover:bg-elevated ${isMdUp ? "" : "h-7 w-7"} focus:outline-none`}
                onClick={() => setOpen(false)}
                aria-label="Close messages"
                title="Close messages"
                size="icon"
                variant="ghost"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <div className={`h-full ${!isMdUp ? "text-center px-4" : ""}`}>{messagesContent}</div>
          </div>
        </div>
      )}
    </div>
  );
};