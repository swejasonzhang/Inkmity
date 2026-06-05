import { useEffect, useState } from "react";
import AvailabilityEditor, { type Availability as EditorAvailability } from "@/components/calender/AvailabilityEditor";
import { apiGet } from "@/api";

type Props = { artistId: string };

async function getAvailability(artistId: string): Promise<EditorAvailability> {
  return apiGet<EditorAvailability>("/availability", { artistId });
}

export default function ArtistSettings({ artistId }: Props) {
  const [initial, setInitial] = useState<EditorAvailability | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAvailability(artistId)
      .then(a => {
        if (active) setInitial(a);
      })
      .catch(e => {
        if (active) setErr(e?.message || "Failed to load availability");
      });
    return () => {
      active = false;
    };
  }, [artistId]);

  if (err) return <div className="text-app">{err}</div>;
  if (!initial) return <div>Loading availability…</div>;
  return <AvailabilityEditor artistId={artistId} initial={initial} />;
}