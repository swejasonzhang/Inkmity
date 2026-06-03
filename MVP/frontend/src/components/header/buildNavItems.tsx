import React from "react";

export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  badge?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
};

export function buildNavItems(
  dashboardDisabled: boolean,
  onDashboardGate: (e: React.MouseEvent) => void,
  role?: "client" | "artist" | null
): NavItem[] {
  // Artists don't need to browse other artists — give them a link to their
  // own studio/portfolio instead. Clients keep the artist directory.
  const discover: NavItem =
    role === "artist"
      ? { label: "Portfolio", to: "/profile" }
      : { label: "Artists", to: "/artists" };

  return [
    dashboardDisabled
      ? { label: "Dashboard", to: "/dashboard", disabled: true, onClick: onDashboardGate }
      : { label: "Dashboard", to: "/dashboard", onClick: onDashboardGate },
    discover,
    { label: "Gallery", to: "/gallery" },
    { label: "Appointments", to: "/appointments" },
    { label: "Contact", to: "/contact" },
    { label: "About", to: "/about" },
  ];
}
