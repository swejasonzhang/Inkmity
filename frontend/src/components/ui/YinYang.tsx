// Inkmity brand motif. Monochrome by design — halves use the theme's fg/bg so
// it reads correctly in both light and dark. Set `spin` to use it as a loader.
export default function YinYang({
  size = 24,
  className = "",
  spin = false,
}: {
  size?: number;
  className?: string;
  spin?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${spin ? "animate-spin [animation-duration:1.4s]" : ""} ${className}`}
      role={spin ? "status" : "img"}
      aria-label={spin ? "Loading" : "Yin and yang"}
    >
      <circle cx="50" cy="50" r="47" fill="var(--bg)" stroke="var(--fg)" strokeWidth="3" />
      <path
        d="M50,3 a47,47 0 0,1 0,94 a23.5,23.5 0 0,1 0,-47 a23.5,23.5 0 0,0 0,-47 z"
        fill="var(--fg)"
      />
      <circle cx="50" cy="26.5" r="8" fill="var(--bg)" />
      <circle cx="50" cy="73.5" r="8" fill="var(--fg)" />
    </svg>
  );
}
