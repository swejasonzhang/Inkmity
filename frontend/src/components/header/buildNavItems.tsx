import React from "react";

export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  badge?: React.ReactNode;
  /** Live count shown as a notification bubble on the nav link. */
  count?: number;
  onClick?: (e: React.MouseEvent) => void;
  /** Secondary links collapse into a "More" menu on desktop to keep the bar lean. */
  secondary?: boolean;
};

export function buildNavItems(
  isSignedIn: boolean,
  onGate: (e: React.MouseEvent) => void,
  role?: "client" | "artist" | "studio" | null
): NavItem[] {
  const gated = (label: string, to: string): NavItem =>
    isSignedIn ? { label, to } : { label, to, disabled: true, onClick: onGate };

  const items: NavItem[] = [gated("Dashboard", "/dashboard")];

  if (isSignedIn && role === "artist") {
    items.push(gated("Portfolio", "/portfolio"));
  }
  if (isSignedIn && role === "studio") {
    items.push(gated("Studios", "/studios"));
  }

  items.push(
    gated("Appointments", "/appointments"),
    { label: "Explore", to: "/explore" },
    { label: "Tiers", to: "/tiers", secondary: true },
    { label: "Contact", to: "/contact", secondary: true },
    { label: "About", to: "/about", secondary: true }
  );

  return items;
}
