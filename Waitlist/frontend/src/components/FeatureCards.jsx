"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Filter,
  Gift,
  Zap,
  Crown,
  Search,
  Star,
  SlidersHorizontal,
  Images,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Blackwork from "@/assets/Blackwork.png";
import FineLine from "@/assets/FineLine.png";
import ColorRealism from "@/assets/ColorRealism.png";
import Lettering from "@/assets/Lettering.png";
import Geometric from "@/assets/Geometric.png";
import Traditional from "@/assets/Traditional.png";

export const Shell = ({
  icon,
  title,
  children,
  compact = true,
  heightClass,
  widthClass,
}) => (
  <Card
    className={`mx-auto w-full h-full ${widthClass ?? "max-w-2xl"} ${
      heightClass
        ? heightClass
        : compact
        ? "min-h-[14rem] sm:min-h-[16rem] md:min-h-[18rem]"
        : "min-h-[20rem] sm:min-h-[22rem] md:min-h-[28rem]"
    } bg-white/[0.04] border-white/15 backdrop-blur flex flex-col`}
  >
    <CardHeader className="flex flex-col items-center justify-center space-y-2 px-4 pt-4 pb-1 md:space-y-3 md:px-6 md:pt-6">
      {icon
        ? React.createElement(icon, { className: "h-5 w-5 text-white/80" })
        : null}
      <CardTitle className="text-lg md:text-xl text-center">{title}</CardTitle>
      <div className="py-2 md:py-3">
        <Separator className="bg-white/15 w-20 md:w-24" />
      </div>
    </CardHeader>
    <CardContent className="flex-1 w-full flex flex-col items-center justify-center text-center px-4 pb-4 md:px-6 md:pb-6">
      {children}
    </CardContent>
  </Card>
);

export function MessagingCard({ compact = true }) {
  const threads = [
    {
      header: "Client • Aiko S.",
      date: "Nov 10",
      status: "Seen",
      msgs: [
        {
          me: false,
          name: "Liam",
          text: "Hey! Can you do fine-line roses?",
          time: "10:12 AM",
        },
        {
          me: true,
          name: "Aiko",
          text: "Absolutely. What size and placement?",
          time: "10:14 AM",
        },
        {
          me: false,
          name: "Liam",
          text: "Forearm, ~4in. Budget $300.",
          time: "10:16 AM",
        },
        {
          me: true,
          name: "Aiko",
          text: "Locked. Friday 2pm works?",
          time: "10:18 AM",
        },
      ],
    },
    {
      header: "Client • Marco T.",
      date: "Nov 9",
      status: "Delivered",
      msgs: [
        {
          me: false,
          name: "Sara",
          text: "Looking for script 'amor fati'.",
          time: "6:21 PM",
        },
        {
          me: true,
          name: "Marco",
          text: "Nice. 3–4in wrist works best.",
          time: "6:24 PM",
        },
        {
          me: false,
          name: "Sara",
          text: "Cool. Can we do Monday?",
          time: "6:25 PM",
        },
        {
          me: true,
          name: "Marco",
          text: "Booked 11:00 AM. See you then.",
          time: "6:27 PM",
        },
      ],
    },
    {
      header: "Client • Evan R.",
      date: "Nov 11",
      status: "Seen",
      msgs: [
        {
          me: false,
          name: "Noah",
          text: "Do you have healed blackwork examples?",
          time: "3:03 PM",
        },
        {
          me: true,
          name: "Evan",
          text: "Yes. Sending album link.",
          time: "3:05 PM",
        },
        {
          me: false,
          name: "Noah",
          text: "Great. What's the deposit?",
          time: "3:06 PM",
        },
        {
          me: true,
          name: "Evan",
          text: "$50 holds the slot. Refundable if rescheduled 48h+.",
          time: "3:08 PM",
        },
      ],
    },
  ];

  return (
    <Shell
      icon={MessageSquare}
      title="Real-time messaging"
      compact={compact}
      widthClass="max-w-md md:max-w-6xl"
      heightClass="min-h-[14rem] sm:min-h-[16rem] md:min-h-[26rem]"
    >
      <div className="w-full mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-md md:max-w-5xl">
        {threads.map((t, ti) => (
          <div
            key={t.header}
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 md:p-4"
          >
            <div className="mb-2 text-xs md:text-sm font-semibold text-white/90">
              {t.header}
            </div>
            <div className="space-y-2 md:space-y-3">
              {t.msgs.map((m, i) => {
                const isLast = i === t.msgs.length - 1;
                return (
                  <motion.div
                    key={`${t.header}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.22, delay: i * 0.05 + ti * 0.02 }}
                    className={`flex ${m.me ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%]">
                      <div
                        className={`rounded-2xl px-3 py-1.5 md:px-3.5 md:py-2 text-[11px] md:text-sm leading-snug border ${
                          m.me
                            ? "bg-white !text-black border-white rounded-br-sm"
                            : "bg-black !text-white border-white/20 rounded-bl-sm"
                        }`}
                      >
                        <div
                          className={`mb-0.5 text-[9px] md:text-[10px] uppercase tracking-wide ${
                            m.me ? "!text-black/70" : "!text-white/70"
                          }`}
                        >
                          {m.name}
                        </div>
                        <div>{m.text}</div>
                      </div>
                      <div
                        className={`mt-1 text-[10px] md:text-[11px] ${
                          m.me
                            ? "text-white/60 text-right pr-1"
                            : "text-white/60 text-left pl-1"
                        }`}
                      >
                        <time className="normal-case">
                          {m.time}
                          {isLast ? ` • ${t.status} • ${t.date}` : ""}
                        </time>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 md:mt-6 flex gap-2 justify-center">
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80 gap-1"
        >
          <Search className="h-3.5 w-3.5" /> Share refs
        </Badge>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80 gap-1"
        >
          <Star className="h-3.5 w-3.5" /> Keep context
        </Badge>
      </div>
    </Shell>
  );
}

export function FiltersCard({ compact = true }) {
  const chips = [
    "Style: Fine-line",
    "City: NYC",
    "Budget: $200-$400",
    "Healed ★4+",
    "Availability: This week",
    "Experience: 5+ years",
    "Highest rated",
    "Most viewed",
  ];

  return (
    <div className="mb-[-3px]">
      <Shell icon={Filter} title="Fast, powerful filters" compact={compact}>
        <div className="w-full flex flex-wrap items-center justify-center gap-2 text-center max-w-md">
          {chips.map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] md:text-xs"
            >
              {c}
            </motion.div>
          ))}
        </div>
        <div className="mt-3 md:mt-6 w-full flex items-center justify-center">
          <div className="w-full max-w-md">
            <Progress value={82} className="h-2 bg-white/5" />
          </div>
        </div>
        <p className="mt-2 text-[11px] md:text-xs text-white/60 text-center">
          82 artists match. Refine in seconds.
        </p>
      </Shell>
    </div>
  );
}

export function RewardsCard({ compact = true }) {
  const points = 1240;
  const milestones = [
    { level: 1, at: 500, reward: "$10 platform fee waived" },
    { level: 2, at: 1000, reward: "$10 platform fee waived" },
    { level: 3, at: 2000, reward: "50% off flash tattoo" },
    { level: 4, at: 3500, reward: "50% off flash tattoo" },
    { level: 5, at: 5000, reward: "Free flash tattoo" },
  ];
  const next =
    milestones.find((m) => m.at > points) ?? milestones[milestones.length - 1];
  const prev = [...milestones].reverse().find((m) => m.at <= points) ?? {
    at: 0,
    level: 0,
    reward: "Start",
  };
  const spanTotal = Math.max(next.at - prev.at, 1);
  const spanProg = Math.min(Math.max(points - prev.at, 0), spanTotal);
  const pctToNext = Math.round((spanProg / spanTotal) * 100);
  const unlocked = milestones
    .filter((m) => points >= m.at)
    .map((m) => m.reward);
  const earners = [
    { k: "Booking", v: 100 },
    { k: "Review", v: 40 },
    { k: "Streak x3", v: 60 },
  ];

  return (
    <Shell
      icon={Gift}
      title="Rewards & progression"
      compact={compact}
      widthClass="max-w-md"
      heightClass="min-h-[40rem] sm:min-h-[44rem] md:min-h-[48rem]"
    >
      <div className="w-full mx-auto flex flex-col items-center text-center gap-5 md:gap-6">
        <div className="flex items-start justify-between gap-4 w-full max-w-lg">
          <div className="flex-1">
            <div className="text-xs md:text-sm text-white/70">
              Current points
            </div>
            <div className="mt-1 text-2xl md:text-3xl font-extrabold">
              {points.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] md:text-xs text-white/60">
              L{prev.level} → L{next.level}
            </div>
          </div>
          <div
            className="relative h-20 w-20 md:h-28 md:w-28 rounded-full grid place-items-center shrink-0"
            style={{
              background: `conic-gradient(white ${
                pctToNext * 3.6
              }deg, rgba(255,255,255,0.15) 0deg)`,
            }}
          >
            <div className="absolute inset-2 rounded-full bg-black/60 backdrop-blur" />
            <div className="relative text-sm font-semibold">{pctToNext}%</div>
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between text-[11px] md:text-xs text-white/70">
            <span>{prev.at.toLocaleString()} pts</span>
            <span>{next.at.toLocaleString()} pts</span>
          </div>
          <div className="mt-2">
            <Progress value={pctToNext} className="h-2 bg-white/5" />
          </div>
          <div className="mt-2 text-[11px] md:text-xs text-white/80">
            {next.at - points > 0
              ? `${(next.at - points).toLocaleString()} points to ${
                  next.reward
                }`
              : "Maxed this tier. Keep earning."}
          </div>
        </div>

        <div className="w-full max-w-2xl px-2 md:px-0">
          <div className="grid grid-cols-5 gap-3 items-end">
            {milestones.map((m, i) => {
              const achieved = points >= m.at;
              return (
                <div key={m.at} className="flex flex-col items-center">
                  <div className="relative flex items-center justify-center pb-2">
                    <div
                      className={`h-3.5 w-3.5 rounded-full border ${
                        achieved
                          ? "bg-white border-white"
                          : "bg-black border-white/40"
                      }`}
                    />
                    {i < milestones.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-1/2 translate-x-2 h-[2px] w-[calc(100%-0.75rem)] ${
                          achieved ? "bg-white" : "bg-white/30"
                        }`}
                      />
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-white/70">
                    L{m.level}
                  </div>
                  <div className="mt-1 text-[11px] text-center text-white/80 line-clamp-2">
                    {m.reward}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-lg px-2 md:px-0">
          <div className="grid grid-cols-1 gap-2">
            {unlocked.slice(-3).map((r, idx) => (
              <div
                key={`${r}-${idx}`}
                className="rounded-md border border-white/15 bg-white/[0.08] px-4 py-2.5 text-[12px] md:text-sm text-center"
              >
                {r}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-lg">
          <div className="text-sm mb-2">How to earn</div>
          <div className="grid grid-cols-3 gap-2">
            {earners.map((e) => (
              <div
                key={e.k}
                className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2"
              >
                <div className="text-[11px] text-white/70">{e.k}</div>
                <div className="text-sm font-semibold mt-1">+{e.v} pts</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full px-2">
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80 h-9 inline-flex items-center justify-center w-full text-center"
          >
            Book to earn
          </Badge>
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80 h-9 inline-flex items-center justify-center w-full text-center"
          >
            Bonuses on reviews
          </Badge>
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80 h-9 inline-flex items-center justify-center w-full text-center"
          >
            Streak multipliers
          </Badge>
        </div>
      </div>
    </Shell>
  );
}

export function FlashDealsCard({ compact = true }) {
  const deals = [
    {
      title: "mini rose",
      price: 80,
      artist: "Aiko S.",
      style: "Fine-line",
      city: "NYC",
    },
    {
      title: "script word",
      price: 120,
      artist: "Marco T.",
      style: "Lettering",
      city: "LA",
    },
    {
      title: "flash sheet pick",
      price: 150,
      artist: "Nina K.",
      style: "Traditional",
      city: "Chicago",
    },
    {
      title: "linework special",
      price: 99,
      artist: "Evan R.",
      style: "Blackwork",
      city: "SF",
    },
    {
      title: "micro mandala",
      price: 130,
      artist: "Theo M.",
      style: "Geometric",
      city: "Austin",
    },
  ];

  function toTitle(s) {
    return s.replace(
      /\w\S*/g,
      (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
    );
  }

  function randomOffsetMs() {
    const steps = Math.floor(Math.random() * (48 - 1 + 1)) + 1;
    return steps * 5 * 60 * 1000;
  }

  const [targets, setTargets] = React.useState(() =>
    deals.map(() => Date.now() + randomOffsetMs())
  );

  React.useEffect(() => {
    const id = setInterval(() => {
      setTargets((prev) =>
        prev.map((t) =>
          t - Date.now() <= 0 ? Date.now() + randomOffsetMs() : t
        )
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function fmtCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(
      2,
      "0"
    )}s`;
  }

  return (
    <Shell
      icon={Zap}
      title="Flash deals"
      compact={compact}
      widthClass="max-w-md"
      heightClass="min-h-0"
    >
      <div className="w-full max-w-md mx-auto flex flex-col gap-6 md:gap-2">
        {deals.map((d, i) => {
          const remaining = targets[i] - Date.now();
          return (
            <motion.div
              key={`${d.artist}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-3 flex flex-col gap-2.5 shadow-[0_6px_20px_rgb(255_255_255/0.05)]"
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <h3 className="text-sm md:text-base font-semibold leading-tight flex-1 min-w-0 truncate">
                  {toTitle(d.title)} — {d.artist}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] md:text-xs">
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 whitespace-nowrap">
                  <span className="text-white/60">Style:</span>{" "}
                  <span className="text-white/90">{d.style}</span>
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 whitespace-nowrap">
                  <span className="text-white/60">City:</span>{" "}
                  <span className="text-white/90">{d.city}</span>
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 whitespace-nowrap">
                  Cost: ${d.price}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-white/70 whitespace-nowrap">
                  Ends in {fmtCountdown(remaining)}
                </span>
                <button className="rounded-md px-3 py-1.5 text-xs md:text-sm font-semibold bg-white hover:opacity-90 !text-black">
                  Claim
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Shell>
  );
}

export function LoyaltyCard({ compact = true }) {
  const tiers = [
    { name: "Ink I", min: 0, max: 999, color: "from-white to-white/40" },
    { name: "Ink II", min: 1000, max: 2499, color: "from-white to-white/40" },
    { name: "Ink III", min: 2500, max: 4999, color: "from-white to-white/40" },
    {
      name: "Ink Elite",
      min: 5000,
      max: 999999,
      color: "from-white to-white/40",
    },
  ];
  const points = 1860;
  const current = [...tiers].reverse().find((t) => points >= t.min) || tiers[0];
  const nextIndex = Math.min(
    tiers.findIndex((t) => t.name === current.name) + 1,
    tiers.length - 1
  );
  const next = tiers[nextIndex];
  const span = Math.max((current.max ?? next.min) - current.min, 1);
  const prog = Math.min(Math.max(points - current.min, 0), span);
  const pctToNext =
    current.name === "Ink Elite" ? 100 : Math.round((prog / span) * 100);
  const perksByTier = {
    "Ink I": ["Standard profile", "Base rewards"],
    "Ink II": [
      "Profile boost ×1.2",
      "Priority booking",
      "Review multiplier +5%",
    ],
    "Ink III": ["Boost ×1.5", "Waitlist skip", "Early flash access"],
    "Ink Elite": ["Boost ×2", "VIP drops", "Free flash monthly"],
  };

  return (
    <Shell icon={Crown} title="Loyalty tiers" compact={compact}>
      <div className="w-full max-w-2xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-5 md:gap-8 items-stretch">
        <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 md:p-5 flex flex-col">
          <div className="flex items-start justify-between gap-4 md:gap-6">
            <div>
              <div className="text-xs text-white/70">Current tier</div>
              <div className="text-xl md:text-2xl font-extrabold">
                {current.name}
              </div>
              <div className="mt-1 text-xs text-white/60">
                {points.toLocaleString()} pts
              </div>
            </div>
            <div
              className="relative h-20 w-20 md:h-24 md:w-24 rounded-full grid place-items-center shrink-0"
              style={{
                background: `conic-gradient(white ${
                  pctToNext * 3.6
                }deg, rgba(255,255,255,0.15) 0deg)`,
              }}
            >
              <div className="absolute inset-2 rounded-full bg-black/60 backdrop-blur" />
              <div className="relative text-sm font-semibold">{pctToNext}%</div>
            </div>
          </div>

          <div className="mt-4 md:mt-5">
            <div className="flex items-center justify-between text-[11px] md:text-xs text-white/70">
              <span>{current.min.toLocaleString()} pts</span>
              <span>
                {current.name === "Ink Elite"
                  ? "Max"
                  : `${next.min.toLocaleString()} pts`}
              </span>
            </div>
            <div className="mt-2">
              <Progress value={pctToNext} className="h-2 bg-white/5" />
            </div>
            <div className="mt-2 text-[11px] md:text-xs text-white/80">
              {current.name === "Ink Elite"
                ? "You’re at the top tier."
                : `${(next.min - points).toLocaleString()} points to ${
                    next.name
                  }`}
            </div>
          </div>

          <div className="mt-4 md:mt-5">
            <div className="text-sm mb-2">Your perks</div>
            <div className="flex flex-wrap gap-2">
              {perksByTier[current.name].map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs h-7 inline-flex items-center justify-center text-center"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5 md:space-y-3 flex flex-col h-full">
          {tiers.map((t) => {
            const active = t.name === current.name;
            const achieved = points >= t.min;
            const widthPct = achieved
              ? 100
              : Math.max(
                  0,
                  Math.min(
                    100,
                    ((points - t.min) / Math.max(t.max - t.min, 1)) * 100
                  )
                );
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25 }}
                className={`relative rounded-xl border px-4 py-3 flex-1 ${
                  active
                    ? "border-white bg-white/[0.08]"
                    : "border-white/15 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-white/70">
                    {t.min.toLocaleString()}+
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full bg-white/10 rounded">
                  <div
                    className={`h-1.5 rounded bg-gradient-to-r ${t.color}`}
                    style={{
                      width: `${widthPct}%`,
                      opacity: achieved ? 1 : 0.6,
                    }}
                  />
                </div>
                {active && (
                  <div className="mt-2 text-[11px] text-white/70">
                    You are here
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function Metric({ label, value, children, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 md:py-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function AnalyticsCard({ compact = true }) {
  const kpis = [
    { label: "Bookings", value: 18 },
    { label: "Revenue", value: "$4,320" },
    { label: "Avg ticket", value: "$240" },
    { label: "Rating", value: "4.8★" },
  ];
  const bars = [
    { day: "M", bookings: 2, revenue: 380 },
    { day: "T", bookings: 3, revenue: 520 },
    { day: "W", bookings: 4, revenue: 980 },
    { day: "T", bookings: 3, revenue: 760 },
    { day: "F", bookings: 4, revenue: 960 },
    { day: "S", bookings: 1, revenue: 300 },
    { day: "S", bookings: 1, revenue: 420 },
  ];
  const utilization = 72;
  const returnRate = 43;
  const noShow = 6;
  const responseMins = 18;
  const topStyles = [
    { name: "Fine-line", pct: 38 },
    { name: "Blackwork", pct: 26 },
    { name: "Script", pct: 18 },
    { name: "Traditional", pct: 10 },
    { name: "Other", pct: 8 },
  ];
  const maxBookings = Math.max(...bars.map((b) => b.bookings)) || 1;
  const maxRevenue = Math.max(...bars.map((b) => b.revenue)) || 1;

  return (
    <Shell icon={BarChart3} title="Artist analytics" compact={compact}>
      <div className="mx-auto w-full max-w-2xl space-y-6 md:space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 text-center">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 md:py-3"
            >
              <div className="text-[11px] text-white/70">{k.label}</div>
              <div className="mt-1 text-base md:text-lg font-semibold">
                {k.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch">
          <div>
            <h4 className="text-sm text-white/80 mb-2">Bookings (7d)</h4>
            <div className="flex items-end justify-between gap-2 h-24 md:h-28 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              {bars.map((b, i) => (
                <motion.div
                  key={`b-${i}`}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="w-5 md:w-6 origin-bottom"
                  style={{
                    height: `${(b.bookings / maxBookings) * 100}%`,
                    background:
                      "linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.35))",
                    borderRadius: "6px",
                  }}
                  title={`${b.day}: ${b.bookings}`}
                />
              ))}
            </div>
            <div className="mt-1.5 md:mt-2 flex justify-between text-[10px] md:text-[11px] text-white/60 px-1">
              {bars.map((b, i) => (
                <span key={`bl-${i}`}>{b.day}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm text-white/80 mb-2">Revenue (7d)</h4>
            <div className="flex items-end justify-between gap-2 h-24 md:h-28 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              {bars.map((b, i) => (
                <motion.div
                  key={`r-${i}`}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="w-5 md:w-6 origin-bottom"
                  style={{
                    height: `${(b.revenue / maxRevenue) * 100}%`,
                    background:
                      "linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.35))",
                    borderRadius: "6px",
                  }}
                  title={`${b.day}: $${b.revenue}`}
                />
              ))}
            </div>
            <div className="mt-1.5 md:mt-2 flex justify-between text-[10px] md:text-[11px] text-white/60 px-1">
              {bars.map((b, i) => (
                <span key={`rl-${i}`}>{b.day}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-stretch">
          <div className="space-y-3 flex flex-col">
            <Metric label="Utilization" value={`${utilization}%`}>
              <Progress value={utilization} className="h-2 bg-white/5" />
            </Metric>
            <Metric label="Return clients" value={`${returnRate}%`}>
              <Progress value={returnRate} className="h-2 bg-white/5" />
            </Metric>
            <Metric label="No-show rate" value={`${noShow}%`}>
              <Progress value={noShow} className="h-2 bg-white/5" />
            </Metric>
            <Metric
              label="Avg response"
              value={`${responseMins}m`}
              className="h-full min-h-[180px] md:min-h-[220px] flex flex-col"
            >
              <div className="text-[11px] text-white/80 text-left grid gap-1">
                <div className="flex items-center justify-between">
                  <span>Median</span>
                  <span className="font-semibold">12m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>P90</span>
                  <span className="font-semibold">48m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Within SLA</span>
                  <span className="font-semibold">94%</span>
                </div>
                <div className="mt-2 text-white/60">
                  Typical delays: peak hours, image uploads, off-hours.
                </div>
              </div>
              <div className="mt-auto" />
            </Metric>
          </div>

          <div className="space-y-4 flex flex-col">
            <div className="rounded-lg border border-white/15 bg-white/[0.06] p-3">
              <div className="text-sm mb-2">Top styles</div>
              <div className="space-y-2">
                {topStyles.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs text-white/80">
                      <span>{s.name}</span>
                      <span>{s.pct}%</span>
                    </div>
                    <Progress value={s.pct} className="h-2 bg-white/5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/[0.06] p-3 h-full min-h-[120px] md:min-h-[160px] overflow-hidden flex flex-col">
              <div className="text-sm md:text-base font-semibold mb-2 text-center">
                Next openings
              </div>
              <div className="flex-1 overflow-y-auto w-full">
                <ul className="w-full space-y-2 px-1">
                  {[
                    { when: "Tue 9:00 AM" },
                    { when: "Thu 2:30 PM" },
                    { when: "Fri 11:00 AM" },
                    { when: "Mon 4:00 PM" },
                    { when: "Wed 8:30 AM" },
                  ]
                    .slice(0, 3)
                    .map((o) => (
                      <li key={o.when} className="w-full">
                        <div className="w-full rounded-md border border-white/15 bg-white/[0.08] px-4 py-2 text-white/90 text-[13px] md:text-sm text-center">
                          {o.when}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
              <div className="mt-auto" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge
            className="bg-white/5 border-white/15 text-white/80 h-8 inline-flex items-center"
            variant="outline"
          >
            Manage payouts
          </Badge>
          <Badge
            className="bg-white/5 border-white/15 text-white/80 h-8 inline-flex items-center"
            variant="outline"
          >
            Improve ranking
          </Badge>
        </div>
      </div>
    </Shell>
  );
}

export function PreferencesCard({ compact = true }) {
  return (
    <div className="-mt-[3px]">
      <Shell
        icon={SlidersHorizontal}
        title="Signup preferences"
        compact={compact}
        heightClass="min-h-[26rem] sm:min-h-[30rem] md:min-h-[34rem]"
      >
        <div className="mx-auto w-full max-w-md space-y-4 md:space-y-5 text-center">
          <div className="space-y-1.5">
            <p className="text-[11px] md:text-xs text-white/70 text-center">
              Style
            </p>
            <p className="text-[10px] md:text-[11px] text-white/60 text-center">
              Pick one or more preferred tattoo styles.
            </p>
            <Select>
              <SelectTrigger className="w-full bg-white/10 border-white/15 text-white justify-center text-center">
                <SelectValue
                  placeholder="Choose styles"
                  className="text-center"
                />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/15 text-white text-center">
                <SelectItem
                  value="fine-line"
                  className="justify-center text-center"
                >
                  Fine-line
                </SelectItem>
                <SelectItem
                  value="blackwork"
                  className="justify-center text-center"
                >
                  Blackwork
                </SelectItem>
                <SelectItem
                  value="traditional"
                  className="justify-center text-center"
                >
                  Traditional
                </SelectItem>
                <SelectItem
                  value="neo-traditional"
                  className="justify-center text-center"
                >
                  Neo-traditional
                </SelectItem>
                <SelectItem
                  value="japanese"
                  className="justify-center text-center"
                >
                  Japanese
                </SelectItem>
                <SelectItem
                  value="realism"
                  className="justify-center text-center"
                >
                  Realism
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] md:text-xs text-white/70 text-center">
              Budget
            </p>
            <p className="text-[10px] md:text-[11px] text-white/60 text-center">
              Set your typical spend range per session.
            </p>
            <Select>
              <SelectTrigger className="w-full bg-white/10 border-white/15 text-white justify-center text-center">
                <SelectValue
                  placeholder="Select budget"
                  className="text-center"
                />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/15 text-white text-center">
                <SelectItem
                  value="100-200"
                  className="justify-center text-center"
                >
                  $100–$200
                </SelectItem>
                <SelectItem
                  value="200-400"
                  className="justify-center text-center"
                >
                  $200–$400
                </SelectItem>
                <SelectItem
                  value="400-800"
                  className="justify-center text-center"
                >
                  $400–$800
                </SelectItem>
                <SelectItem
                  value="800plus"
                  className="justify-center text-center"
                >
                  $800+
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] md:text-xs text-white/70 text-center">
              City
            </p>
            <p className="text-[10px] md:text-[11px] text-white/60 text-center">
              Choose where you want to book.
            </p>
            <Select>
              <SelectTrigger className="w-full bg-white/10 border-white/15 text-white justify-center text-center">
                <SelectValue
                  placeholder="Pick a city"
                  className="text-center"
                />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/15 text-white text-center">
                <SelectItem value="nyc" className="justify-center text-center">
                  New York City
                </SelectItem>
                <SelectItem value="la" className="justify-center text-center">
                  Los Angeles
                </SelectItem>
                <SelectItem value="chi" className="justify-center text-center">
                  Chicago
                </SelectItem>
                <SelectItem value="mia" className="justify-center text-center">
                  Miami
                </SelectItem>
                <SelectItem value="sf" className="justify-center text-center">
                  San Francisco
                </SelectItem>
                <SelectItem
                  value="remote"
                  className="justify-center text-center"
                >
                  Open to travel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] md:text-xs text-white/70 text-center">
              Availability
            </p>
            <p className="text-[10px] md:text-[11px] text-white/60 text-center">
              Tell artists when you prefer to meet.
            </p>
            <Select>
              <SelectTrigger className="w-full bg-white/10 border-white/15 text-white justify-center text-center">
                <SelectValue
                  placeholder="When are you free?"
                  className="text-center"
                />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/15 text-white text-center">
                <SelectItem value="asap" className="justify-center text-center">
                  ASAP
                </SelectItem>
                <SelectItem
                  value="this-week"
                  className="justify-center text-center"
                >
                  This week
                </SelectItem>
                <SelectItem
                  value="weekends"
                  className="justify-center text-center"
                >
                  Weekends
                </SelectItem>
                <SelectItem
                  value="evenings"
                  className="justify-center text-center"
                >
                  Evenings
                </SelectItem>
                <SelectItem
                  value="next-month"
                  className="justify-center text-center"
                >
                  Next month
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Shell>
    </div>
  );
}

export function GalleryCard({ compact = true }) {
  const imgs = [
    { src: Blackwork, label: "Blackwork" },
    { src: FineLine, label: "Fine-line" },
    { src: ColorRealism, label: "Color realism" },
    { src: Lettering, label: "Lettering" },
    { src: Geometric, label: "Geometric" },
    { src: Traditional, label: "Traditional" },
  ];

  return (
    <Shell icon={Images} title="Gallery access" compact={compact}>
      <div className="mx-auto w-full max-w-2xl [perspective:1200px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 place-items-center">
          {imgs.map((img, i) => (
            <motion.figure
              key={img.src.toString()}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              whileHover={{
                y: -6,
                rotateX: 2,
                rotateY: -2,
                scale: 1.04,
                transition: { type: "spring", stiffness: 220, damping: 18 },
              }}
              className="group relative w-full max-w-[220px] sm:max-w-[260px] aspect-[2/3] rounded-xl border border-white/15 bg-black overflow-visible"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
            >
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <img
                  src={img.src}
                  alt={`${img.label} tattoo`}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 260px"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
              </div>
              <figcaption className="absolute left-2 bottom-2">
                <span className="rounded-full border border-white/20 bg-black/70 backdrop-blur px-2.5 py-1 text-[10px] font-medium text-white">
                  {img.label}
                </span>
              </figcaption>
              <div className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg bg-white/10" />
            </motion.figure>
          ))}
        </div>
      </div>

      <div className="mt-4 md:mt-6 flex gap-2 justify-center w-full px-2">
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80 h-8 inline-flex items-center w-full"
        >
          Browse styles
        </Badge>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80 h-8 inline-flex items-center w-full"
        >
          Save favorites
        </Badge>
      </div>
    </Shell>
  );
}
