import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  minSkeletonMs?: number;
  className?: string;
};

const LAZY_MS = 2000;

export default function LazyReveal({
  loading,
  skeleton,
  children,
  minSkeletonMs = LAZY_MS,
  className,
}: Props) {
  const [ready, setReady] = useState(false);
  const mountRef = useRef<number>(Date.now());

  useEffect(() => {
    if (loading) {
      setReady(false);
      return;
    }
    const elapsed = Date.now() - mountRef.current;
    const wait = Math.max(0, minSkeletonMs - elapsed);
    const t = window.setTimeout(() => setReady(true), wait);
    return () => window.clearTimeout(t);
  }, [loading, minSkeletonMs]);

  if (!ready) return <>{skeleton}</>;
  return <div className={`ink-reveal ${className ?? ""}`}>{children}</div>;
}
