import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import type { Role } from "@/hooks/useInkConversations";

type Props = {
  role: Role;
  isMdUp: boolean;
  width: number;
  height: number;
  open: boolean;
  closing?: boolean;
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
  closing,
  setOpen,
  unreadConvoCount,
  requestCount,
  derivedTotal,
  messagesContent,
}) => {
  useScrollLock(open);

  const wrapperWidth = width;
  const badgeH = isMdUp ? 22 : 16;
  const badgeMinW = badgeH;
  const badgePadX = isMdUp ? 6 : 4;
  const badgeFont = isMdUp ? 12 : 10;

  return (
    <div
      className={`ink-conv-scope bg-card text-app ${!isMdUp && open ? "flex" : "inline-flex"} items-center justify-center ${open ? "rounded-2xl" : "rounded-full"} ${closing ? "ink-panel-out" : open ? "ink-panel-in" : ""} pointer-events-auto border border-app shadow-md transition`}
      aria-label={open ? "Messages" : "Open messages"}
      aria-expanded={open}
      {...(open ? { role: "dialog", "aria-modal": true } : {})}
      style={{
        width: wrapperWidth as number | string,
        height,
        borderRadius: open ? 16 : 9999,
        contain: "layout paint",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {!open ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="ink-fade-quick flex h-full w-full items-center justify-center gap-1.5 px-2.5 md:px-3 py-1.5 leading-none text-center focus:outline-none"
          title="Open messages"
          aria-label="Open messages"
          variant="ghost"
        >
          <MessageSquare size={18} className="shrink-0" />
          <span className="hidden md:inline text-sm font-medium leading-none whitespace-nowrap">Messages</span>
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
        <div className="flex flex-col overflow-hidden" style={{ width, height }}>
          <div
            className={`flex items-center justify-between ${isMdUp ? "px-3 py-2" : "px-2 py-3"} border-b border-app/40`}
            style={!isMdUp ? { minHeight: "50px" } : undefined}
          >
            <div
              className={`flex items-center gap-2 font-semibold cursor-pointer ${!isMdUp ? "h-10" : ""}`}
              style={!isMdUp ? { minHeight: "40px" } : undefined}
              onClick={() => setOpen(false)}
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
            <div className={`h-full ${!isMdUp ? "px-0" : "px-3"}`}>{messagesContent}</div>
          </div>
        </div>
      )}
    </div>
  );
};