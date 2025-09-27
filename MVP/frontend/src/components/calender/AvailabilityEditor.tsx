import { useMemo, useState } from "react";
import type { Availability, TimeRange, Weekday } from "../../lib/api";
import { saveAvailability } from "../../lib/api";

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
  const [slotMinutes, setSlotMinutes] = useState<number>(
    initial?.slotMinutes ?? 60
  );
  const [timezone, setTimezone] = useState<string>(
    initial?.timezone ?? "America/New_York"
  );
  const [weekly, setWeekly] = useState<Record<Weekday, TimeRange[]>>(
    initial?.weekly ?? {
      sun: [],
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
    }
  );
  const [exceptions, setExceptions] = useState<Record<string, TimeRange[]>>(
    initial?.exceptions ?? {}
  );

  const [activeDay, setActiveDay] = useState<Weekday>("mon");
  const [start, setStart] = useState<string>("10:00");
  const [end, setEnd] = useState<string>("18:00");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const addWeeklyRange = () => {
    if (!start || !end) return;
    setWeekly((prev) => ({
      ...prev,
      [activeDay]: [...prev[activeDay], { start, end }],
    }));
  };

  const removeWeeklyRange = (i: number) => {
    setWeekly((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].filter((_, idx) => idx !== i),
    }));
  };

  const addExceptionRange = () => {
    if (!selectedDate || !start || !end) return;
    setExceptions((prev) => {
      const old = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: [...old, { start, end }] };
    });
  };

  const removeExceptionRange = (dateKey: string, i: number) => {
    setExceptions((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((_, idx) => idx !== i),
    }));
  };

  const clearExceptionDate = (dateKey: string) => {
    setExceptions((prev) => ({ ...prev, [dateKey]: [] }));
  };

  const payload: Availability = useMemo(
    () => ({ artistId, timezone, slotMinutes, weekly, exceptions }),
    [artistId, timezone, slotMinutes, weekly, exceptions]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-700 p-4">
        <h3 className="font-semibold mb-3">Recurring Weekly Availability</h3>

        <div className="flex gap-3 items-center mb-3">
          <label className="text-sm">Slot length</label>
          <select
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
            value={slotMinutes}
            onChange={(e) => setSlotMinutes(Number(e.target.value))}
          >
            {[15, 30, 45, 60, 90].map((v) => (
              <option key={v} value={v}>
                {v} minutes
              </option>
            ))}
          </select>

          <label className="text-sm ml-4">Timezone</label>
          <input
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {WEEKDAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDay(d.key)}
              className={`px-3 py-1 rounded ${
                activeDay === d.key ? "bg-white text-black" : "bg-neutral-800"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
          <span>to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
          <button
            onClick={addWeeklyRange}
            className="ml-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {(weekly[activeDay] || []).map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-neutral-800 rounded px-3 py-2"
            >
              <span>
                {r.start} – {r.end}
              </span>
              <button
                className="text-red-400 hover:text-red-300"
                onClick={() => removeWeeklyRange(i)}
              >
                Remove
              </button>
            </li>
          ))}
          {(weekly[activeDay] || []).length === 0 && (
            <p className="text-sm text-neutral-400">
              No hours set for this weekday yet.
            </p>
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-neutral-700 p-4">
        <h3 className="font-semibold mb-3">Date Overrides (Exceptions)</h3>

        <div className="flex gap-2 mb-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
          <span>to</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-neutral-800 border border-neutral-600 rounded px-3 py-2"
          />
          <button
            className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500"
            onClick={addExceptionRange}
          >
            Add for {selectedDate || "date"}
          </button>
        </div>

        {Object.keys(exceptions).length === 0 && (
          <p className="text-sm text-neutral-400">No exceptions added.</p>
        )}

        {Object.entries(exceptions).map(([dateKey, ranges]) => (
          <div key={dateKey} className="mb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{dateKey}</h4>
              <button
                className="text-yellow-300 hover:text-yellow-200"
                onClick={() => clearExceptionDate(dateKey)}
              >
                Clear overrides (closed all day)
              </button>
            </div>
            <ul className="space-y-2 mt-1">
              {(ranges || []).map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-neutral-800 rounded px-3 py-2"
                >
                  <span>
                    {r.start} – {r.end}
                  </span>
                  <button
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeExceptionRange(dateKey, i)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={async () => {
            await saveAvailability(artistId, payload);
            alert("Availability saved");
          }}
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-500"
        >
          Save Availability
        </button>
      </div>
    </div>
  );
}