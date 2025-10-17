import ArtistsSection from "@/components/dashboard/client/ArtistsSection";
import type { ArtistDto } from "@/hooks/useDashboardData";

type Props = {
    artists: ArtistDto[];
    loading: boolean;
    showArtists: boolean;
    page: number;
    totalPages: number;
    onPageChange: (next: number) => void;
    onSelectArtist: (a: ArtistDto) => void;
};

export default function ClientDashboard({
    artists,
    loading,
    showArtists,
    page,
    totalPages,
    onPageChange,
    onSelectArtist,
}: Props) {
    return (
        <div className="flex-1 min-w-0">
            <ArtistsSection
                artists={artists}
                loading={loading}
                showArtists={showArtists}
                onSelectArtist={onSelectArtist}
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </div>
    );
}