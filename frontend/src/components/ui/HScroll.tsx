import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";

export type HScrollHandle = { scrollByDir: (dir: number) => void };

const HScroll = forwardRef<HScrollHandle, { children: ReactNode; className?: string }>(
  ({ children, className = "" }, ref) => {
    const el = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
      scrollByDir: (dir: number) => {
        const node = el.current;
        if (node) node.scrollBy({ left: dir * node.clientWidth * 0.85, behavior: "smooth" });
      },
    }));
    return (
      <div
        ref={el}
        className={`flex gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
    );
  }
);
HScroll.displayName = "HScroll";

export default HScroll;
