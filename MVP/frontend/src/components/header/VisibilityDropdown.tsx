import { useState, useRef, useEffect } from "react";
import { Circle, Clock, EyeOff } from "lucide-react";

export type VisibilityStatus = "online" | "away" | "invisible";

type VisibilityOption = {
  value: VisibilityStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
};

const visibilityOptions: VisibilityOption[] = [
  {
    value: "online",
    label: "Online",
    icon: <Circle size={10} className="fill-current" />,
    color: "text-green-500",
    description: "Visible to everyone",
  },
  {
    value: "away",
    label: "Away",
    icon: <Clock size={10} className="fill-current" />,
    color: "text-yellow-500",
    description: "Away but visible",
  },
  {
    value: "invisible",
    label: "Invisible",
    icon: <EyeOff size={10} className="fill-current" />,
    color: "text-gray-400",
    description: "Appear offline",
  },
];

type VisibilityDropdownProps = {
  currentStatus: VisibilityStatus;
  isOnline: boolean;
  onStatusChange: (status: VisibilityStatus) => void;
  className?: string;
};

export const VisibilityDropdown = ({
  currentStatus,
  isOnline,
  onStatusChange,
  className = "",
}: VisibilityDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = visibilityOptions.find((opt) => opt.value === currentStatus) || visibilityOptions[0];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSelect = (status: VisibilityStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  // If socket is disconnected, show offline regardless of visibility status
  const displayStatus = isOnline ? currentStatus : "invisible";
  const displayOption = visibilityOptions.find((opt) => opt.value === displayStatus) || visibilityOptions[0];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[color-mix(in_oklab,var(--elevated)_30%,transparent)] transition-colors text-xs font-medium opacity-70 hover:opacity-100 whitespace-nowrap"
        aria-label="Change visibility status"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={`${displayOption.color} flex items-center`}>
          {displayOption.icon}
        </span>
        <span className="hidden lg:inline">{displayOption.label}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[2147482999]" onClick={() => setIsOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-48 bg-card border border-[color-mix(in_oklab,var(--fg)_16%,transparent)] rounded-lg shadow-[0_12px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-[2147483001]"
          >
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(option.value);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] transition-colors flex items-center gap-3 ${
                  currentStatus === option.value ? "bg-[color-mix(in_oklab,var(--elevated)_30%,transparent)]" : ""
                }`}
              >
                <span className={`${option.color} flex items-center flex-shrink-0`}>
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-app">{option.label}</div>
                  <div className="text-xs opacity-70 text-app">{option.description}</div>
                </div>
                {currentStatus === option.value && (
                  <span className="text-xs opacity-60">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
