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
    return (
        <div
            className="bg-app text-app inline-flex items-center justify-center gap-2 rounded-full pointer-events-auto border border-app shadow-md transition focus-within:ring-2 focus-within:ring-app/40"
            aria-label={open ? "Messages" : "Open messages"}
            aria-expanded={open}
            style={{
                willChange: "width,height",
                width,
                height,
                borderRadius: open ? 16 : 9999,
                transition:
                    "width 900ms cubic-bezier(0.22,1,0.36,1), height 900ms cubic-bezier(0.22,1,0.36,1), border-radius 900ms ease, padding 700ms ease",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {!open && derivedTotal > 0 && (
                <span
                    aria-label={`${derivedTotal} ${role === "Artist" ? "unread + requests" : "unread"}`}
                    title={`${derivedTotal} ${role === "Artist" ? "unread + requests" : "unread"}`}
                    className="absolute grid place-items-center rounded-full"
                    style={{
                        top: 2,
                        right: 2,
                        height: 18,
                        minWidth: 18,
                        paddingInline: 4,
                        fontSize: 10,
                        fontWeight: 800,
                        background: "var(--fg)",
                        color: "var(--bg)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 0 0 1px var(--bg), 0 6px 16px rgba(0,0,0,0.35)",
                        pointerEvents: "none",
                        zIndex: 2,
                    }}
                >
                    {derivedTotal > 99 ? "99+" : derivedTotal}
                </span>
            )}

            {!open ? (
                <Button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="flex h-full w-full items-center justify-center gap-2 px-2 focus:outline-none"
                    title="Open messages"
                    aria-label="Open messages"
                    variant="ghost"
                >
                    <MessageSquare size={18} />
                    <span className="text-sm font-medium hidden md:inline">Messages</span>
                </Button>
            ) : (
                <div className="flex-1 h-full w-full flex-col">
                    <div className={`flex items-center justify-between ${isMdUp ? "px-3 py-2" : "px-2 py-1"} border-b border-app`}>
                        <div className="flex items-center gap-2 font-semibold">
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
                                className={`p-1 rounded-full hover:bg-elevated ${isMdUp ? "" : "h-7 w-7"}`}
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
                    <div className="flex-1">
                        <div className="h-full">{messagesContent}</div>
                    </div>
                </div>
            )}
        </div>
    );
};