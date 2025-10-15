import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type Props = {
    date: Date | undefined;
    month: Date;
    onDateChange: (d: Date | undefined) => void;
    onMonthChange: (m: Date) => void;
    startOfToday: Date;
};

export default function CalendarPicker({
    date,
    month,
    onDateChange,
    onMonthChange,
    startOfToday,
}: Props) {
    const currentYear = startOfToday.getFullYear();
    const currentMonth = startOfToday.getMonth();

    const years = useMemo(() => {
        const toYear = currentYear + 5;
        return Array.from({ length: toYear - currentYear + 1 }, (_, i) => currentYear + i);
    }, [currentYear]);

    const handleMonthSelect = (v: string) => {
        const m = Number(v);
        let next = new Date(month.getFullYear(), m, 1);
        if (next < new Date(currentYear, currentMonth, 1)) {
            next = new Date(currentYear, currentMonth, 1);
        }
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
            className="flex flex-col items-center justify-center rounded-xl min-h-[560px] px-4 py-4"
            style={{ background: "var(--elevated)" }}
        >
            <div className="w-full max-w-[560px] mx-auto flex flex-col items-center justify-center gap-3">
                <div className="relative z-[9999] isolate flex flex-wrap items-center justify-center gap-2">
                    <Select value={String(month.getMonth())} onValueChange={handleMonthSelect}>
                        <SelectTrigger
                            className="h-9 w-36 border-0 rounded-xl px-3 text-sm shadow-sm"
                            style={{ background: "var(--card)", color: "var(--fg)" }}
                            aria-label="Month"
                        >
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            sideOffset={8}
                            collisionPadding={12}
                            className="z-[10000] max-h-60 overflow-auto rounded-xl border"
                            style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                        >
                            {MONTHS.map((m, i) => {
                                const disable = month.getFullYear() === currentYear && i < currentMonth;
                                return (
                                    <SelectItem
                                        key={m}
                                        value={String(i)}
                                        disabled={disable}
                                        className="cursor-pointer"
                                    >
                                        {m}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    <Select value={String(month.getFullYear())} onValueChange={handleYearSelect}>
                        <SelectTrigger
                            className="h-9 w-24 border-0 rounded-xl px-3 text-sm shadow-sm"
                            style={{ background: "var(--card)", color: "var(--fg)" }}
                            aria-label="Year"
                        >
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            sideOffset={8}
                            collisionPadding={12}
                            className="z-[10000] max-h-60 overflow-auto rounded-xl border"
                            style={{ background: "var(--card)", color: "var(--fg)", borderColor: "var(--border)" }}
                        >
                            {years.map((y) => (
                                <SelectItem
                                    key={y}
                                    value={String(y)}
                                    disabled={y < currentYear}
                                    className="cursor-pointer"
                                >
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full text-center -mb-1 px-2">
                    <span className="text-base sm:text-lg font-semibold" style={{ color: "var(--fg)" }}>
                        {date
                            ? date.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                            })
                            : "Select a date"}
                    </span>
                </div>

                <div className="w-full px-2">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                            if (!d) return;
                            if (d < startOfToday) return;
                            onDateChange(d);
                        }}
                        month={month}
                        onMonthChange={(m) => {
                            const guard = new Date(currentYear, currentMonth, 1);
                            onMonthChange(m < guard ? guard : m);
                        }}
                        fromDate={startOfToday}
                        disabled={{ before: startOfToday }}
                        showOutsideDays={false}
                        className="w-full max-w-[560px] rounded-lg p-3 border"
                        style={{
                            background: "var(--card)",
                            color: "var(--fg)",
                            borderColor: "var(--border)",
                        }}
                        classNames={{
                            day: "h-14 w-14 m-1 p-0 font-normal rounded-md outline-none focus:outline-none",
                            head_cell: "text-xs font-medium",
                            caption_label: "text-sm font-medium",
                        }}
                        modifiersClassNames={{
                            selected: "ring-2 ring-white !ring-offset-0 !bg-transparent !text-[inherit]",
                            today: "font-semibold",
                            disabled: "opacity-40",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
