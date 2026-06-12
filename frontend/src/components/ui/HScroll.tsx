import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontal, snap-scrolling carousel row with hover arrows on desktop.
export default function HScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="relative group/hscroll">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => by(-1)}
        className="hidden md:grid place-items-center absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-app bg-card/90 backdrop-blur text-app opacity-0 group-hover/hscroll:opacity-100 transition hover:bg-elevated"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={ref}
        className={`flex gap-3 overflow-x-auto scroll-smooth snap-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => by(1)}
        className="hidden md:grid place-items-center absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-app bg-card/90 backdrop-blur text-app opacity-0 group-hover/hscroll:opacity-100 transition hover:bg-elevated"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
