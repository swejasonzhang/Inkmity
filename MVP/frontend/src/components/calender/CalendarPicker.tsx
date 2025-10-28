import { useMemo } from "react";
import { Calendar as UIPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
    variant,
}: {
    label: string;
    number: string;
    variant: "available" | "unavailable" | "selected";
}) {
    const base = "aspect-square h-9 w-9 rounded-md font-normal leading-none flex items-center justify-center";
    const ring = variant === "selected" ? "ring-2 ring-[color:var(--fg)]" : "";
    const style = variant === "unavailable" ? { color: "color-mix(in oklab, var(--fg) 55%, transparent)" } : { color: "var(--fg)" };
    return (
        <div className="inline-flex items-center gap-2">
            <div className={`${base} ${ring}`} style={{ background: "transparent" }}>
                <span className="text-[11px]" style={style}>
                    {number}
                </span>
            </div>
            <span style={{ color: "var(--fg)" }}>{label}</span>
        </div>
    );
}

export default function CalendarPicker({ date, month, onDateChange, onMonthChange, startOfToday }: Props) {
    const currentYear = startOfToday.getFullYear();
    const currentMonth = startOfToday.getMonth();
    const todayNumber = String(startOfToday.getDate());

    const years = useMemo(() => {
        const toYear = currentYear + 5;
        return Array.from({ length: toYear - currentYear + 1 }, (_, i) => currentYear + i);
    }, [currentYear]);

    const handleMonthSelect = (v: string) => {
        const m = Number(v);
        let next = new Date(month.getFullYear(), m, 1);
        if (next < new Date(currentYear, currentMonth, 1)) next = new Date(currentYear, currentMonth, 1);
        onMonthChange(next);
    };

    const handleYearSelect = (v: string) => {
        let y = Number(v);
        if (y < currentYear) y = currentYear;
        const safeMonth = month.getMonth() < currentMonth && y === currentYear ? currentMonth : month.getMonth();
        onMonthChange(new Date(y, safeMonth, 1));
    };

    return (
        <div className="flex flex-col items-center justify-center rounded-xl px-4 py-6 w-full min-h-[640px]" style={{ background: "var(--elevated)" }}>
            <div className="w-full max-w-[640px] mx-auto flex flex-col items-center justify-center gap-5">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                    <h3 className="text-base font-semibold" style={{ color: "var(--fg)" }}>
                        Choose a date
                    </h3>
                    <p className="text-xs opacity-80" style={{ color: "var(--fg)" }}>
                        Only dates from today onward are available.
                    </p>
                </div>

                <div className="relative z-[1] isolate flex items-center justify-center gap-2">
                    <Select value={String(month.getMonth())} onValueChange={handleMonthSelect}>
                        <SelectTrigger className="h-9 w-36 border-0 rounded-xl px-3 text-sm shadow-sm" style={{ background: "var(--card)", color: "var(--fg)" }} aria-label="Month">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-[10000] max-h-60 overflow-auto rounded-xl border" style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
                            {MONTHS.map((m, i) => {
                                const disable = month.getFullYear() === currentYear && i < currentMonth;
                                return (
                                    <SelectItem key={m} value={String(i)} disabled={disable} className="cursor-pointer">
                                        {m}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={String(month.getFullYear())} onValueChange={handleYearSelect}>
                        <SelectTrigger className="h-9 w-24 border-0 rounded-xl px-3 text-sm shadow-sm" style={{ background: "var(--card)", color: "var(--fg)" }} aria-label="Year">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className="z-[10000] max-h-60 overflow-auto rounded-xl border" style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)} disabled={y < currentYear} className="cursor-pointer">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full text-center">
                    <span className="text-base sm:text-lg font-semibold" style={{ color: "var(--fg)" }}>
                        {date ? date.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }) : "Select a date"}
                    </span>
                </div>

                <div className="flex items-center justify-center gap-6 text-xs">
                    <LegendTile label="Available" number={todayNumber} variant="available" />
                    <LegendTile label="Unavailable" number={todayNumber} variant="unavailable" />
                    <LegendTile label="Selected" number={todayNumber} variant="selected" />
                </div>

                <div className="w-full flex items-center justify-center">
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
                        className="w-full max-w-[640px] rounded-lg p-7 border"
                        style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            borderColor: "var(--border)",
                            ["--cell-size" as any]: "3.25rem",
                        }}
                        classNames={{
                            day: "h-[3.25rem] w-[3.25rem] mx-1.5 my-1 p-0 font-normal rounded-md outline-none focus:outline-none",
                            head_cell: "text-xs font-medium px-2.5",
                            caption_label: "text-sm font-medium",
                        }}
                        modifiersClassNames={{
                            selected: "ring-2 ring-[color:var(--fg)]",
                        }}
                    />
                </div>

                <div className="w-full flex items-center justify-between pt-1">
                    <div className="text-xs opacity-70" style={{ color: "var(--fg)" }}>
                        Times shown in your local timezone.
                    </div>
                    <Button variant="ghost" className="h-8 rounded-lg" style={{ color: "var(--fg)" }} onClick={() => onDateChange(undefined)} disabled={!date}>
                        Clear
                    </Button>
                </div>
            </div>
        </div>
    );
}