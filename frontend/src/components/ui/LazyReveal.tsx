import { useEffect, useRef, useState, type ReactNode } from "react";

const LAZY_MS = 2000;

type GroupState = {
  startedAt: number;
  minMs: number;
  members: Set<symbol>;
  loading: Set<symbol>;
  revealed: boolean;
  subs: Set<() => void>;
  timer: number | null;
};

const groups = new Map<string, GroupState>();

function getGroup(key: string, minMs: number): GroupState {
  let g = groups.get(key);
  if (!g) {
    g = {
      startedAt: Date.now(),
      minMs,
      members: new Set(),
      loading: new Set(),
      revealed: false,
      subs: new Set(),
      timer: null,
    };
    groups.set(key, g);
  }
  return g;
}

function evaluate(key: string) {
  const g = groups.get(key);
  if (!g || g.revealed) return;
  if (g.timer) {
    window.clearTimeout(g.timer);
    g.timer = null;
  }
  if (g.loading.size > 0) return;
  const remaining = g.startedAt + g.minMs - Date.now();
  if (remaining <= 0) {
    g.revealed = true;
    g.subs.forEach((fn) => fn());
  } else {
    g.timer = window.setTimeout(() => evaluate(key), remaining);
  }
}

type Props = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  minSkeletonMs?: number;
  className?: string;
  group?: string;
};

export default function LazyReveal({
  loading,
  skeleton,
  children,
  minSkeletonMs = LAZY_MS,
  className,
  group = "global",
}: Props) {
  const idRef = useRef<symbol | null>(null);
  if (idRef.current === null) idRef.current = Symbol("lazy-reveal");
  const [, force] = useState(0);
  const revealedRef = useRef(false);

  useEffect(() => {
    const id = idRef.current as symbol;
    const g = getGroup(group, minSkeletonMs);
    g.members.add(id);
    const sub = () => {
      revealedRef.current = true;
      force((n) => n + 1);
    };
    g.subs.add(sub);
    if (g.revealed) sub();
    return () => {
      g.members.delete(id);
      g.loading.delete(id);
      g.subs.delete(sub);
      if (g.members.size === 0) {
        if (g.timer) window.clearTimeout(g.timer);
        groups.delete(group);
      } else {
        evaluate(group);
      }
    };
  }, [group, minSkeletonMs]);

  useEffect(() => {
    const id = idRef.current as symbol;
    const g = getGroup(group, minSkeletonMs);
    if (loading) g.loading.add(id);
    else g.loading.delete(id);
    evaluate(group);
  }, [loading, group, minSkeletonMs]);

  if (!revealedRef.current) {
    const g = groups.get(group);
    if (!g || !g.revealed) return <>{skeleton}</>;
  }
  return <div className={`ink-reveal ${className ?? ""}`}>{children}</div>;
}
