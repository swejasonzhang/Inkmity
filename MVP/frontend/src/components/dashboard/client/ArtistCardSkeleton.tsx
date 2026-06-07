// Shared so the lazy-chunk fallback (ClientDashboard) and the data-load skeleton
// (ArtistsSection) render the exact same card shape/dimensions as a real ArtistCard.
export const ArtistCardSkeleton = () => (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden rounded-3xl border border-app bg-card/90">
        <div className="relative w-full flex-shrink-0" style={{ height: 'clamp(7rem, 9vh + 1.5vw, 11rem)' }}>
            <div className="ink-shimmer absolute inset-0" />
            <div
                className="ink-shimmer absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] rounded-full ring-2 ring-[color:var(--card)]"
                style={{ width: 'clamp(4rem, 5.5vh + 1vw, 6.5rem)', height: 'clamp(4rem, 5.5vh + 1vw, 6.5rem)' }}
            />
        </div>
        <div
            className="flex-1 min-h-0 flex flex-col items-center w-full"
            style={{ padding: 'clamp(0.5rem, 1.2vh + 0.4vw, 1rem) clamp(0.625rem, 1.2vh + 0.4vw, 1rem)', gap: 'clamp(0.375rem, 0.9vh + 0.25vw, 0.75rem)' }}
        >
            <div className="ink-shimmer h-4 w-1/2 rounded" />
            <div className="ink-shimmer h-6 w-2/3 rounded-full" />
            <div className="ink-shimmer h-3 w-full rounded" />
            <div className="ink-shimmer h-3 w-4/5 rounded" />
            <div className="mt-auto w-full grid grid-cols-3 gap-1.5">
                <div className="ink-shimmer aspect-square rounded-lg" />
                <div className="ink-shimmer aspect-square rounded-lg" />
                <div className="ink-shimmer aspect-square rounded-lg" />
            </div>
        </div>
    </div>
);

export default ArtistCardSkeleton;
