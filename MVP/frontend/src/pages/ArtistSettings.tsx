import { useEffect, useState } from "react";
import AvailabilityEditor from "../components/calender/AvailabilityEditor";
import { getAvailability, type Availability } from "@/lib/api";

type Props = { artistId: string };

export default function ArtistSettings({ artistId }: Props) {
  const [initial, setInitial] = useState<Availability | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAvailability(artistId)
      .then((a) => {
        if (active) setInitial(a);
      })
      .catch((e) => {
        if (active) setErr(e?.message || "Failed to load availability");
      });
    return () => {
      active = false;
    };
  }, [artistId]);

  if (err) return <div className="text-red-400">{err}</div>;
  if (!initial) return <div>Loading availability…</div>;
  return <AvailabilityEditor artistId={artistId} initial={initial} />;
}