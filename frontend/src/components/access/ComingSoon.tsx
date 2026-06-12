import VideoBackground from "@/components/VideoBackground";
import { useTheme } from "@/hooks/useTheme";

export default function ComingSoon() {
  const { themeClass } = useTheme();
  return (
    <div className={themeClass} data-ink="dark" data-ink-no-theme="true">
      <div className="relative min-h-svh flex flex-col items-center justify-center px-6 text-center text-app">
        <VideoBackground />
        <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--elevated)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-app/70">
            Currently in testing
          </span>
          <h1
            className="font-extrabold tracking-tight text-app"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
          >
            Inkmity is almost here.
          </h1>
          <p className="text-subtle text-base sm:text-lg">
            We're putting the final ink on things. The platform is being tested
            right now and will open to everyone soon.
          </p>
          <p className="text-app/40 text-xs">
            Follow along — launch is announced when everything's verified.
          </p>
        </div>
      </div>
    </div>
  );
}
