export const ArtistCardSkeleton = () => (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden rounded-2xl border border-app bg-card">
        <div className="ink-shimmer flex-1 min-h-0 w-full" />
        <div className="shrink-0 p-3 flex items-center gap-2">
            <span className="ink-shimmer h-8 w-8 rounded-full shrink-0" />
            <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                <span className="ink-shimmer h-3.5 w-2/3 rounded" />
                <span className="ink-shimmer h-3 w-2/5 rounded" />
            </span>
            <span className="ink-shimmer h-8 w-12 rounded-full shrink-0" />
        </div>
    </div>
);
