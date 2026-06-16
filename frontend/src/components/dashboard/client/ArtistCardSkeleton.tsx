export const ArtistCardSkeleton = () => (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden rounded-2xl border border-app bg-card">
        <div className="ink-shimmer w-full min-h-0" style={{ flex: "1.8 1 0%" }} />
        <div className="w-full min-h-0" style={{ flex: "1 1 0%", background: "var(--bg)" }} />
    </div>
);
