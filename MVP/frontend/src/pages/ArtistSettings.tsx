import { useEffect, useState } from "react"
import AvailabilityEditor from "@/components/calender/AvailabilityEditor"
import { http } from "@/lib/http"

type Availability = { days: Array<{ day: number; slots: { start: string; end: string }[] }> }

type Props = { artistId: string }

async function getAvailability(artistId: string): Promise<Availability> {
  return http<Availability>("/availability", { method: "GET" }, undefined, { artistId })
}

export default function ArtistSettings({ artistId }: Props) {
  const [initial, setInitial] = useState<Availability | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAvailability(artistId)
      .then(a => {
        if (active) setInitial(a)
      })
      .catch(e => {
        if (active) setErr(e?.message || "Failed to load availability")
      })
    return () => {
      active = false
    }
  }, [artistId])

  if (err) return <div className="text-red-400">{err}</div>
  if (!initial) return <div>Loading availability…</div>
  return <AvailabilityEditor artistId={artistId} initial={initial} />
}
