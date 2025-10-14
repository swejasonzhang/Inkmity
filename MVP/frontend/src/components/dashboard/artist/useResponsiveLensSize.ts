import { useEffect, useState } from "react";

export default function useResponsiveLensSize() {
  const [size, setSize] = useState(180);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      if (w < 480) setSize(120);
      else if (w < 768) setSize(140);
      else setSize(170);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return size;
}