import React from "react";

export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  badge?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
};

export function buildNavItems(
  isSignedIn: boolean,
  onGate: (e: React.MouseEvent) => void,
  role?: "client" | "artist" | null
): NavItem[] {
  const gated = (label: string, to: string): NavItem =>
    isSignedIn ? { label, to } : { label, to, disabled: true, onClick: onGate };

  const items: NavItem[] = [gated("Dashboard", "/dashboard")];

  if (isSignedIn && role === "artist") items.push(gated("Portfolio", "/portfolio"));

  items.push(
    gated("Appointments", "/appointments"),
    gated("Gallery", "/gallery"),
    { label: "Tiers", to: "/tiers" },
    { label: "Contact", to: "/contact" },
    { label: "About", to: "/about" }
  );

  return items;
}
