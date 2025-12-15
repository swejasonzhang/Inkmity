import React from "react";
import { Lock } from "lucide-react";

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
  const galleryBadge = (
    <span className="inline-flex items-center gap-1 text-[10px] bg-elevated text-app px-1.5 py-0.5 rounded-full border border-app">
      <Lock size={10} /> In progress
    </span>
  );

  return [
    { label: "Landing", to: "/landing" },
    dashboardDisabled
      ? { label: "Dashboard", to: "/dashboard", disabled: true, onClick: onDashboardGate }
      : { label: "Dashboard", to: "/dashboard", onClick: onDashboardGate },
    { label: "Appointments", to: "/appointments" },
    { label: "Gallery", to: "#", disabled: true, badge: galleryBadge },
    { label: "Contact", to: "/contact" },
    { label: "About Inkmity", to: "/about" },
  ];
}
