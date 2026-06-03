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

  const discover =
    role === "artist" ? gated("Portfolio", "/portfolio") : gated("Artists", "/artists");

  return [
    gated("Dashboard", "/dashboard"),
    discover,
    gated("Appointments", "/appointments"),
    gated("Gallery", "/gallery"),
    { label: "Contact", to: "/contact" },
    { label: "About", to: "/about" },
  ];
}
