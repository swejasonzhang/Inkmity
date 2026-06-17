import { Calendar as UIPicker } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
    date: Date | undefined;
    month: Date;
    onDateChange: (d: Date | undefined) => void;
    onMonthChange: (m: Date) => void;
    startOfToday: Date;
};

function LegendTile({
    label,
    number,
    variant
}: {
    label: string;
    number: string;
    variant: "available" | "unavailable" | "selected";
}) {
    const base = "aspect-square h-7 w-7 rounded-md leading-none flex items-center justify-center";
    const ring = variant === "selected" ? "ring-2 ring-[color:var(--fg)]" : "";
    const style =
        variant === "unavailable"
            ? { color: "color-mix(in srgb, var(--fg) 50%, transparent)" }
            : { color: "var(--fg)" };
    return (
        <div className="inline-flex items-center gap-1.5">
            <div className={`${base} ${ring}`} style={{ background: "transparent" }}>
                <span className="text-[11px] font-semibold" style={style}>
                    {number}
                </span>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: "var(--fg)" }}>
                {label}
            </span>
        </div>
    );
}

export default function CalendarPicker({ date, month, onDateChange, onMonthChange, startOfToday }: Props) {
    const currentYear = startOfToday.getFullYear();
    const currentMonth = startOfToday.getMonth();
    const todayNumber = String(startOfToday.getDate());

    const guardMonth = new Date(currentYear, currentMonth, 1);
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const prevDisabled = prevMonth < guardMonth;
    const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    return (
        <div
            className="flex flex-col items-center rounded-2xl border w-full h-full px-3 py-4"
            style={{ background: "var(--elevated)", borderColor: "var(--border)" }}
        >
            <div className="w-full mx-auto flex flex-col items-stretch gap-2.5 max-w-[28rem] h-full min-h-0">
                <div className="flex flex-col items-center text-center gap-0.5">
                    <h3 className="text-base sm:text-lg font-bold" style={{ color: "var(--fg)" }}>
                        Choose a date
                    </h3>
                    <p className="text-[12px] sm:text-sm font-medium opacity-70" style={{ color: "var(--fg)" }}>
                        Only dates from today onward are available.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                    <LegendTile label="Available" number={todayNumber} variant="available" />
                    <LegendTile label="Unavailable" number={todayNumber} variant="unavailable" />
                    <LegendTile label="Selected" number={todayNumber} variant="selected" />
                </div>

                <div className="w-full flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => onMonthChange(prevMonth)}
                        disabled={prevDisabled}
                        aria-label="Previous month"
                        className="grid place-items-center h-8 w-8 rounded-full border transition hover:brightness-110 active:scale-90 disabled:opacity-35 disabled:cursor-not-allowed"
                        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 90%, transparent)", color: "var(--fg)" }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-base sm:text-lg font-bold text-center min-w-[9.5rem]" style={{ color: "var(--fg)" }}>
                        {monthLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => onMonthChange(nextMonth)}
                        aria-label="Next month"
                        className="grid place-items-center h-8 w-8 rounded-full border transition hover:brightness-110 active:scale-90"
                        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--elevated) 90%, transparent)", color: "var(--fg)" }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="w-full flex-1 min-h-0 flex">
                    <UIPicker
                        mode="single"
                        weekStartsOn={0}
                        fixedWeeks
                        selected={date}
                        onSelect={(selected?: Date) => {
                            if (!selected) return;
                            onDateChange(selected);
                        }}
                        month={month}
                        onMonthChange={(m: Date) => {
                            const guard = new Date(currentYear, currentMonth, 1);
                            onMonthChange(m < guard ? guard : m);
                        }}
                        fromDate={startOfToday}
                        disabled={{ before: startOfToday }}
                        showOutsideDays={false}
                        className="w-full h-full flex flex-col rounded-xl border p-2.5 sm:p-3"
                        style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            borderColor: "var(--border)",
                            ["--cell-size" as any]: "2.25rem"
                        }}
                        classNames={{
                            root: "w-full h-full flex flex-col",
                            months: "flex flex-col h-full w-full",
                            month: "flex flex-col h-full w-full gap-2",
                            nav: "hidden",
                            month_caption: "hidden",
                            table: "w-full flex-1 flex flex-col",
                            weekdays: "flex gap-x-1 sm:gap-x-1.5",
                            weekday: "flex-1 text-center text-[11px] sm:text-xs font-semibold pb-1",
                            week: "flex w-full flex-1 gap-x-1 sm:gap-x-1.5 mt-1",
                            day: "flex-1 min-h-0 p-0 font-semibold text-sm sm:text-base [&>button]:h-full [&>button]:w-full [&>button]:rounded-md [&>button]:flex [&>button]:items-center [&>button]:justify-center",
                            today: "rounded-md [&>button]:rounded-md",
                            caption_label: "text-base sm:text-lg font-bold",
                            button_previous: "rounded-full border border-[color:color-mix(in_srgb,var(--fg)_20%,transparent)] backdrop-blur-sm transition hover:brightness-110 active:scale-90",
                            button_next: "rounded-full border border-[color:color-mix(in_srgb,var(--fg)_20%,transparent)] backdrop-blur-sm transition hover:brightness-110 active:scale-90"
                        }}
                        modifiersClassNames={{
                            selected: "ring-2 ring-[color:var(--fg)]"
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
