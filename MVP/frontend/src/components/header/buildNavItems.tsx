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
  onDashboardGate: (e: React.MouseEvent) => void
): NavItem[] {
  return [
    dashboardDisabled
      ? { label: "Dashboard", to: "/dashboard", disabled: true, onClick: onDashboardGate }
      : { label: "Dashboard", to: "/dashboard", onClick: onDashboardGate },
    { label: "Artists", to: "/artists" },
    { label: "Appointments", to: "/appointments" },
    { label: "Contact", to: "/contact" },
    { label: "About", to: "/about" },
  ];
}
