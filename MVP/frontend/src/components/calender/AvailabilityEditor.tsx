import { useMemo, useState } from "react";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface TimeRange {
  start: string;
  end: string;
}

export interface Availability {
  artistId: string;
  timezone: string;
  slotMinutes: number;
  weekly: Record<Weekday, TimeRange[]>;
  exceptions: Record<string, TimeRange[]>;
}

async function saveAvailability(data: Availability) {
  const res = await fetch(`/availability/${data.artistId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timezone: data.timezone,
      slotMinutes: data.slotMinutes,
      weekly: data.weekly,
      exceptions: data.exceptions,
    }),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Save failed");
  return res.json();
}

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

type Props = {
  artistId: string;
  initial: Availability;
};

export default function AvailabilityEditor({ artistId, initial }: Props) {
  const browserTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; } catch { return "America/New_York"; }
  }, []);
  const allTimezones = useMemo(() => {
    try {
      const list = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
      if (list && list.length) return list;
    } catch { }
    return [
      "UTC", "Etc/UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Toronto", "America/Vancouver", "America/Mexico_City", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm", "Europe/Zurich", "Europe/Athens", "Europe/Helsinki", "Africa/Johannesburg", "Asia/Dubai", "Asia/Jerusalem", "Asia/Istanbul", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"
    ];
  }, []);

  const [slotMinutes, setSlotMinutes] = useState<number>(initial?.slotMinutes ?? 60);
  const [timezone, setTimezone] = useState<string>(initial?.timezone || browserTz);
  const [weekly, setWeekly] = useState<Record<Weekday, TimeRange[]>>(
    initial?.weekly ?? { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] }
  );
  const [exceptions, setExceptions] = useState<Record<string, TimeRange[]>>(initial?.exceptions ?? {});
  const [activeDay, setActiveDay] = useState<Weekday>("mon");
  const [start, setStart] = useState<string>("10:00");
  const [end, setEnd] = useState<string>("18:00");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const addWeeklyRange = () => {
    if (!start || !end) return;
    setWeekly((prev) => ({ ...prev, [activeDay]: [...prev[activeDay], { start, end }] }));
  };

  const removeWeeklyRange = (i: number) => {
    setWeekly((prev) => ({ ...prev, [activeDay]: prev[activeDay].filter((_, idx) => idx !== i) }));
  };

  const addExceptionRange = () => {
    if (!selectedDate || !start || !end) return;
    setExceptions((prev) => {
      const old = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: [...old, { start, end }] };
    });
  };

  const removeExceptionRange = (dateKey: string, i: number) => {
    setExceptions((prev) => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter((_, idx) => idx !== i) }));
  };

  const clearExceptionDate = (dateKey: string) => {
    setExceptions((prev) => ({ ...prev, [dateKey]: [] }));
  };

  const payload: Availability = useMemo(
    () => ({ artistId, timezone, slotMinutes, weekly, exceptions }),
    [artistId, timezone, slotMinutes, weekly, exceptions]
  );

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-2xl border border-white/15 bg-gray-900/60 backdrop-blur p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl font-semibold">Recurring Weekly Availability</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">Slot length</span>
              <select
                className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
              >
                {[15, 30, 45, 60, 90].map((v) => (
                  <option key={v} value={v}>{v} minutes</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">Timezone</span>
              <input
                list="tz-list"
                className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30 w-64"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                onBlur={(e) => setTimezone(e.target.value.trim())}
                placeholder="Start typing a timezone…"
              />
              <datalist id="tz-list">
                {allTimezones.map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              className={`px-3 py-1.5 rounded-lg border ${activeDay === d.key ? "bg-white text-black border-white" : "bg-gray-900 text-white border-white/15 hover:bg-gray-800"}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <span className="text-white/70">to</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <div className="sm:ml-2">
            <button onClick={addWeeklyRange} className="px-4 py-2 rounded-lg border border-white bg-white text-black hover:bg-gray-200 transition">
              Add range
            </button>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {(weekly[activeDay] || []).map((r, i) => (
            <li key={i} className="flex items-center justify-between bg-gray-900 border border-white/10 rounded-lg px-3 py-2">
              <span className="tracking-wide">{r.start} – {r.end}</span>
              <button className="text-white/80 hover:text-white underline underline-offset-4" onClick={() => removeWeeklyRange(i)}>
                Remove
              </button>
            </li>
          ))}
          {(weekly[activeDay] || []).length === 0 && <p className="text-sm text-white/60">No hours set for this weekday yet.</p>}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/15 bg-gray-900/60 backdrop-blur p-6">
          <h3 className="text-xl font-semibold mb-4">Date Overrides (Exceptions)</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <span className="text-white/70">to</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="bg-gray-900 border border-white/15 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <button className="px-4 py-2 rounded-lg border border-white bg-white text-black hover:bg-gray-200 transition" onClick={addExceptionRange}>
              Add override
            </button>
          </div>
          {Object.keys(exceptions).length === 0 && <p className="mt-4 text-sm text-white/60">No exceptions added.</p>}
        </div>

        <div className="rounded-2xl border border-white/15 bg-gray-900/60 backdrop-blur p-6">
          <h3 className="text-xl font-semibold mb-4">Overrides Summary</h3>
          <div className="space-y-4">
            {Object.entries(exceptions).map(([dateKey, ranges]) => (
              <div key={dateKey} className="rounded-lg border border-white/10">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <h4 className="font-medium">{dateKey}</h4>
                  <button className="text-white/80 hover:text-white underline underline-offset-4" onClick={() => clearExceptionDate(dateKey)}>
                    Clear day
                  </button>
                </div>
                <ul className="p-2 space-y-2">
                  {(ranges || []).map((r, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-900 border border-white/10 rounded-md px-3 py-2">
                      <span>{r.start} – {r.end}</span>
                      <button className="text-white/80 hover:text-white underline underline-offset-4" onClick={() => removeExceptionRange(dateKey, i)}>
                        Remove
                      </button>
                    </li>
                  ))}
                  {(ranges || []).length === 0 && <p className="text-sm text-white/60 px-1">Closed all day.</p>}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={async () => {
            await saveAvailability(payload);
            alert("Availability saved");
          }}
          className="px-5 py-2.5 rounded-lg border border-white bg-white text-black hover:bg-gray-200 transition"
        >
          Save Availability
        </button>
      </div>
    </div>
  );
}
