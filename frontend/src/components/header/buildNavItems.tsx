import React from "react";

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
  const gated = (label: string, to: string): NavItem =>
    isSignedIn ? { label, to } : { label, to, disabled: true, onClick: onGate };

  const isProvider = role === "artist" || role === "studio";
  const items: NavItem[] = [
    isProvider ? gated("Dashboard", "/dashboard") : gated("Artists", "/artists"),
  ];

  if (isSignedIn && role === "artist") {
    items.push(gated("Portfolio", "/portfolio"));
  }
  if (isSignedIn && role === "studio") {
    items.push(gated("Studios", "/studios"));
  }

  items.push(gated("Appointments", "/appointments"));

  if (!isProvider) {
    items.push({ label: "Explore", to: "/explore" });
  }

  items.push(
    { label: "Tiers", to: "/tiers", secondary: true },
    { label: "Contact", to: "/contact", secondary: true },
    { label: "About", to: "/about", secondary: true }
  );

  return items;
}
