import { useState, useEffect, useRef } from "react";
import { Circle, Clock, EyeOff, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisibilityStatus } from "./VisibilityDropdown";
import { useTheme } from "@/hooks/useTheme";

type VisibilityStatusDropdownProps = {
  currentStatus: VisibilityStatus;
  isOnline: boolean;
  onStatusChange: (status: VisibilityStatus) => void;
  className?: string;
  triggerWidth?: number;
};

const getVisibilityOptions = (theme: "light" | "dark") => [
  {
    value: "online" as VisibilityStatus,
    label: "Online",
    icon: Circle,
    color: theme === "light" ? "text-black" : "text-white",
    description: "Visible to everyone",
  },
  {
    value: "away" as VisibilityStatus,
    label: "Away",
    icon: Clock,
    color: theme === "light" ? "text-gray-500" : "text-gray-400",
    description: "Away but visible",
  },
  {
    value: "invisible" as VisibilityStatus,
    label: "Invisible",
    icon: EyeOff,
    color: theme === "light" ? "text-gray-300" : "text-gray-600",
    description: "Appear offline",
  },
];

export const VisibilityStatusDropdown = ({
  currentStatus,
  isOnline,
  onStatusChange,
  className = "",
  triggerWidth,
}: VisibilityStatusDropdownProps) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number>(triggerWidth || 0);
  const visibilityOptions = getVisibilityOptions(theme);

  useEffect(() => {
    if (triggerWidth) {
      setWidth(triggerWidth);
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setWidth(rect.width);
    }
  }, [open, triggerWidth]);

  const displayStatus = isOnline ? currentStatus : "invisible";
  const displayOption = visibilityOptions.find((opt) => opt.value === displayStatus) || visibilityOptions[0];
  const Icon = displayOption.icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] text-app transition-colors ${className}`}
        >
          <Icon size={14} className={displayOption.color} />
          <span className="text-sm font-medium">{displayOption.label}</span>
          <ChevronDown size={14} className="opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        side="bottom"
        style={{ width: width || undefined }}
        className="bg-card border-[color-mix(in_oklab,var(--fg)_16%,transparent)] text-app"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="menu"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="menu"]')) {
            e.preventDefault();
          }
        }}
      >
        <DropdownMenuRadioGroup
          value={currentStatus}
          onValueChange={(value) => {
            const newStatus = value as VisibilityStatus;
            if (newStatus !== currentStatus) {
              onStatusChange(newStatus);
            }
            setTimeout(() => {
              setOpen(false);
            }, 0);
          }}
        >
          {visibilityOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                onSelect={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (option.value !== currentStatus) {
                    onStatusChange(option.value);
                  }
                  setTimeout(() => {
                    setOpen(false);
                  }, 0);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center gap-2 text-app hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)]"
              >
                <OptionIcon size={12} className={option.color} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs opacity-70">{option.description}</div>
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
