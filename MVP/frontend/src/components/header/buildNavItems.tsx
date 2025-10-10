import { MouseEvent } from "react";

export type NavItem = {
  label: string;
  to: string;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
};

export function buildNavItems(dashboardDisabled: boolean, onDashboardGate: (e: MouseEvent) => void): NavItem[] {
  const items: NavItem[] = [
    { label: "Home", to: "/landing" },
    { label: "Dashboard", to: "/dashboard", onClick: dashboardDisabled ? onDashboardGate : undefined },
    {
      label: "Gallery",
      to: "#",
      disabled: true,
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    { label: "Pricing", to: "/pricing" },
  ];
  return items;
}
