import { useEffect, useState } from "react";

const getLensSize = (width: number) => {
  if (width < 480) return 80;
  if (width < 768) return 100;
  if (width < 1024) return 120;
  return 150;
};

export default function useResponsiveLensSize() {
  const [size, setSize] = useState(() =>
    typeof window === "undefined" ? 120 : getLensSize(window.innerWidth)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setSize(getLensSize(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}