import { useState, useEffect, useRef, useMemo } from "react";
import { Circle, Clock, EyeOff, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";

export type VisibilityStatus = "online" | "away" | "invisible";

type VisibilityDropdownProps = {
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
    color: theme === "light" ? "text-gray-600" : "text-gray-400",
    description: "Away but visible",
  },
  {
    value: "invisible" as VisibilityStatus,
    label: "Invisible",
    icon: EyeOff,
    color: theme === "light" ? "text-gray-400" : "text-gray-500",
    description: "Appear offline",
  },
];

export const VisibilityDropdown = ({
  currentStatus,
  isOnline,
  onStatusChange,
  className = "",
  triggerWidth,
}: VisibilityDropdownProps) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number>(triggerWidth || 0);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">(theme);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      const dash = document.getElementById("dashboard-scope");
      const isLight = dash?.classList.contains("ink-light") || dash?.getAttribute("data-ink") === "light";
      setCurrentTheme(isLight ? "light" : "dark");
    };
    
    handleThemeChange();
    window.addEventListener("ink:theme-change", handleThemeChange);
    return () => {
      window.removeEventListener("ink:theme-change", handleThemeChange);
    };
  }, []);

  const visibilityOptions = useMemo(() => getVisibilityOptions(currentTheme), [currentTheme]);

  useEffect(() => {
    if (triggerWidth) {
      setWidth(triggerWidth);
    } else if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setWidth(rect.width);
    }
  }, [open, triggerWidth, currentTheme]);

  const displayStatus = isOnline ? currentStatus : "invisible";
  const displayOption = visibilityOptions.find((opt) => opt.value === displayStatus) || visibilityOptions[0];
  const Icon = displayOption.icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
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
        style={{ 
          width: width || undefined,
          minWidth: width || undefined,
          maxWidth: width || undefined
        }}
        className="bg-card border-[color-mix(in_oklab,var(--fg)_16%,transparent)] text-app z-[2147483700]"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="menu"]') || target.closest('[data-slot="dropdown-menu"]')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[role="menu"]') || target.closest('[data-slot="dropdown-menu"]')) {
            e.preventDefault();
            e.stopPropagation();
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
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {visibilityOptions.map((option) => {
            const OptionIcon = option.icon;
            return (
              <DropdownMenuRadioItem
                key={`${option.value}-${currentTheme}`}
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
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center justify-center gap-2 text-app hover:bg-[color-mix(in_oklab,var(--elevated)_50%,transparent)] whitespace-nowrap"
              >
                <OptionIcon size={12} className={option.color} />
                <span className="text-sm font-medium whitespace-nowrap">{option.label}</span>
                <span className="text-xs opacity-70 whitespace-nowrap">{option.description}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
