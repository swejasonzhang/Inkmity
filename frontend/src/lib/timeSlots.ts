export function toMinutes(hm: string): number {
  const [hStr, mStr] = String(hm).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function atTimeLocal(day: Date, hm: string): Date {
  const mins = toMinutes(hm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export function addMinutesLocal(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60_000);
}

export function buildDefaultFrames(day: Date, open = "10:00", close = "22:00", step = 30): Date[] {
  const start = atTimeLocal(day, open);
  const end = atTimeLocal(day, close);
  const out: Date[] = [];
  let t = new Date(start);
  while (t < end) {
    out.push(new Date(t));
    t = addMinutesLocal(t, step);
  }
  return out;
}

export function timeKeyLocal(d: Date): string {
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}
