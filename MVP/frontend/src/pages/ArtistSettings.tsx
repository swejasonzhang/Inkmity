import { useEffect, useState } from "react";
import AvailabilityEditor from "../components/calender/AvailabilityEditor";
import { getAvailability, type Availability } from "../lib/api";

type Props = { artistId: string };

export default function ArtistSettings({ artistId }: Props) {
  const [initial, setInitial] = useState<Availability | null>(null);

  useEffect(() => {
    getAvailability(artistId).then(setInitial).catch(console.error);
  }, [artistId]);

  if (!initial) return <div>Loading availability…</div>;
  return <AvailabilityEditor artistId={artistId} initial={initial} />;
}
