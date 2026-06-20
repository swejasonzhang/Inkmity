import React from "react";
import { STUDIOS_ENABLED } from "@/lib/features";

export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  badge?: React.ReactNode;
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  secondary?: boolean;
};

export function buildNavItems(
  isSignedIn: boolean,
  onGate: (e: React.MouseEvent) => void,
  role?: "client" | "artist" | "studio" | null
): NavItem[] {
  if (!isSignedIn) return [];

  const gate = (item: NavItem): NavItem =>
    isSignedIn ? item : { ...item, disabled: true, onClick: onGate };

  const isProvider = role === "artist" || role === "studio";
  const items: NavItem[] = [
    gate(isProvider ? { label: "Dashboard", to: "/dashboard" } : { label: "Artists", to: "/artists" }),
  ];

  if (isSignedIn && role === "artist") {
    items.push(gate({ label: "Portfolio", to: "/portfolio" }));
  }
  if (STUDIOS_ENABLED && isSignedIn && role === "studio") {
    items.push(gate({ label: "Studios", to: "/studios" }));
  }

  items.push(gate({ label: "Appointments", to: "/appointments" }));

  if (!isProvider) {
    items.push(gate({ label: "Explore", to: "/explore" }));
  }

  items.push(
    gate({ label: "Tiers", to: "/tiers", secondary: true }),
    gate({ label: "Contact", to: "/contact", secondary: true }),
    gate({ label: "About", to: "/about", secondary: true })
  );

  return items;
}
