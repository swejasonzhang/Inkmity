import { useState } from "react";

type Props = {
  artistId: string;
};

type Kind = "consultation" | "appointment";
type Meridiem = "AM" | "PM";

function generateHalfHourTimes(meridiem: Meridiem): string[] {
  const out: string[] = [];
  for (let h = 0; h < 12; h++) {
    const label = h === 0 ? 12 : h;
    out.push(`${label}:00 ${meridiem}`);
    out.push(`${label}:30 ${meridiem}`);
  }
  return out;
}

export default function BookingPicker({}: Props) {
  const [kind, setKind] = useState<Kind>("appointment");
  const [meridiem, setMeridiem] = useState<Meridiem>("AM");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  const times = generateHalfHourTimes(meridiem);
  const canConfirm = Boolean(selectedTime);

  return (
    <div className="rounded-xl border border-gray-700 p-4 bg-black text-white grid gap-3 sm:grid-cols-2 min-h-[90vh] pb-6">
      <h3 className="font-semibold mb-1 sm:col-span-2">Book a Time</h3>

      <div>
        <span className="block text-sm mb-2 text-gray-200">Type</span>
        <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setKind("consultation")}
            className={`px-4 py-2 text-sm border-r border-gray-700 ${
              kind === "consultation"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            Consultation
          </button>
          <button
            type="button"
            onClick={() => setKind("appointment")}
            className={`px-4 py-2 text-sm ${
              kind === "appointment"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            Appointment
          </button>
        </div>
      </div>

      <div>
        <span className="block text-sm mb-2 text-gray-200">AM / PM</span>
        <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setMeridiem("AM");
              setSelectedTime(null);
            }}
            className={`px-4 py-2 text-sm border-r border-gray-700 ${
              meridiem === "AM"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => {
              setMeridiem("PM");
              setSelectedTime(null);
            }}
            className={`px-4 py-2 text-sm ${
              meridiem === "PM"
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      <div className="sm:col-span-2 mt-1">
        <span className="block text-sm mb-2 text-gray-200">Time</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {times.map((t) => {
            const isActive = selectedTime === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={[
                  "px-3 py-2 rounded border transition",
                  isActive
                    ? "bg-white text-black border-white"
                    : "bg-gray-900 text-white border-gray-700 hover:bg-gray-800",
                ].join(" ")}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-sm text-gray-300">
          {selectedTime ? (
            <span>
              Selected:{" "}
              <span className="text-white font-medium">{selectedTime}</span> •{" "}
              <span className="text-white font-medium capitalize">{kind}</span>
            </span>
          ) : (
            <span>Select a time above.</span>
          )}
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="text-sm block mb-1 text-gray-200">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe your idea, placement, size, or any references."
          rows={5}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-28 md:min-h-36 resize-y"
        />
      </div>

      <div className="sm:col-span-2 flex items-center justify-between gap-4 mt-4">
        <p className="text-xs text-white/70">
          After booking, the slot will disappear to prevent double-booking.
        </p>
        <button
          disabled={!canConfirm}
          onClick={() => {
            const prefixedNote = `[${kind.toUpperCase()}] ${note || ""}`.trim();
            alert(
              `Booked: ${selectedTime} • ${kind}${
                prefixedNote ? `\nNote: ${prefixedNote}` : ""
              }`
            );
            setSelectedTime(null);
            setNote("");
          }}
          className={[
            "px-4 py-2 rounded font-medium border",
            canConfirm
              ? "bg-white text-black border-white hover:bg-gray-200"
              : "bg-gray-700 text-gray-300 border-gray-700 cursor-not-allowed",
          ].join(" ")}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}