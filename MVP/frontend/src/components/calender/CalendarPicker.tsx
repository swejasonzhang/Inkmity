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
    variant
}: {
    label: string;
    number: string;
    variant: "available" | "unavailable" | "selected";
}) {
    const base = "aspect-square h-9 w-9 rounded-md leading-none flex items-center justify-center";
    const ring = variant === "selected" ? "ring-2 ring-[color:var(--fg)]" : "";
    const style =
        variant === "unavailable"
            ? { color: "color-mix(in oklab, var(--fg) 55%, transparent)" }
            : { color: "var(--fg)" };
    return (
        <div className="inline-flex items-center gap-2">
            <div className={`${base} ${ring}`} style={{ background: "transparent" }}>
                <span className="text-[12px] font-semibold" style={style}>
                    {number}
                </span>
            </div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--fg)" }}>
                {label}
            </span>
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
        <div
            className="flex flex-col items-center justify-center rounded-xl w-full px-2 py-4"
            style={{ background: "var(--elevated)" }}
        >
            <div className="w-full mx-auto flex flex-col items-stretch gap-3 max-w-[18rem] xs:max-w-[19rem] sm:max-w-[34rem] lg:max-w-[44rem]">
                <div className="flex flex-col items-center text-center gap-0.5 px-1">
                    <h3 className="text-base sm:text-lg font-bold" style={{ color: "var(--fg)" }}>
                        Choose a date
                    </h3>
                    <p className="text-[12px] sm:text-sm font-medium opacity-80" style={{ color: "var(--fg)" }}>
                        Only dates from today onward are available.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-2">
                    <Select value={String(month.getMonth())} onValueChange={handleMonthSelect}>
                        <SelectTrigger
                            className="h-10 w-full sm:w-36 border-0 rounded-xl px-3 text-base sm:text-lg font-semibold shadow-sm"
                            style={{ background: "var(--card)", color: "var(--fg)" }}
                            aria-label="Month"
                        >
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            collisionPadding={8}
                            className="z-[10000] max-h-60 overflow-auto rounded-xl border"
                            style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                        >
                            {MONTHS.map((m, i) => {
                                const disable = month.getFullYear() === currentYear && i < currentMonth;
                                return (
                                    <SelectItem key={m} value={String(i)} disabled={disable} className="cursor-pointer text-base font-semibold">
                                        {m}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={String(month.getFullYear())} onValueChange={handleYearSelect}>
                        <SelectTrigger
                            className="h-10 w-full sm:w-28 border-0 rounded-xl px-3 text-base sm:text-lg font-semibold shadow-sm"
                            style={{ background: "var(--card)", color: "var(--fg)" }}
                            aria-label="Year"
                        >
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            collisionPadding={8}
                            className="z-[10000] max-h-60 overflow-auto rounded-xl border"
                            style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                        >
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)} disabled={y < currentYear} className="cursor-pointer text-base font-semibold">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full text-center px-1">
                    <span className="text-base sm:text-lg font-bold leading-7" style={{ color: "var(--fg)" }}>
                        {date
                            ? date.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
                            : "Select a date"}
                    </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs">
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
                        className="w-full rounded-lg border"
                        style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            borderColor: "var(--border)",
                            ["--cell-size" as any]: "clamp(2rem, 6vw, 3.25rem)",
                            ["--cell-gap-x" as any]: "clamp(0.2rem, 0.8vw, 0.4rem)",
                            ["--cell-gap-y" as any]: "clamp(0.2rem, 0.8vw, 0.4rem)"
                        }}
                        classNames={{
                            table: "w-full sm:border-separate sm:[border-spacing:0_10px]",
                            day:
                                "h-[var(--cell-size)] w-[var(--cell-size)] mx-[var(--cell-gap-x)] my-[var(--cell-gap-y)] p-0 font-semibold rounded-md outline-none focus:outline-none text-base",
                            head_cell: "text-[12px] sm:text-sm font-semibold px-2",
                            caption_label: "text-base sm:text-lg font-bold leading-7"
                        }}
                        modifiersClassNames={{
                            selected: "ring-2 ring-[color:var(--fg)]"
                        }}
                    />
                </div>

                <div className="w-full flex items-center justify-between pt-1 gap-1.5">
                    <div className="text-[12px] sm:text-sm font-medium opacity-70 truncate" style={{ color: "var(--fg)" }}>
                        Times shown in your local timezone.
                    </div>
                    <Button
                        variant="ghost"
                        className="h-9 rounded-lg px-3 text-base font-semibold"
                        style={{ color: "var(--fg)" }}
                        onClick={() => onDateChange(undefined)}
                        disabled={!date}
                    >
                        Clear
                    </Button>
                </div>
            </div>
        </div>
    );
}