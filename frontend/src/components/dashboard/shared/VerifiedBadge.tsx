import { BadgeCheck } from "lucide-react";

type Props = { size?: number; label?: boolean; className?: string };

export default function VerifiedBadge({ size = 14, label = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-app ${className}`}
      title="Verified artist"
      aria-label="Verified artist"
    >
      <BadgeCheck style={{ width: size, height: size }} strokeWidth={2} aria-hidden />
      {label && <span className="text-[11px] font-semibold">Verified</span>}
    </span>
  );
}
