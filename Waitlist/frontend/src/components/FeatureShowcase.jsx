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

const Shell = ({ icon, title, children }) => (
  <Card className="mx-auto w-full max-w-2xl min-h-[24rem] md:min-h-[28rem] bg-white/[0.04] border-white/15 backdrop-blur flex flex-col">
    <CardHeader className="flex flex-col items-center justify-center space-y-3">
      {icon
        ? React.createElement(icon, { className: "h-5 w-5 text-white/80" })
        : null}
      <CardTitle className="text-xl text-center">{title}</CardTitle>
      <Separator className="bg-white/15 w-24" />
    </CardHeader>
    <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
      {children}
    </CardContent>
  </Card>
);

export function MessagingCard() {
  const msgs = [
    { me: false, name: "Client", text: "Hey! Can you do fine-line roses?" },
    { me: true, name: "Artist", text: "Absolutely. What size and placement?" },
    { me: false, name: "Client", text: "Forearm, ~4in. Budget $300." },
    { me: true, name: "Artist", text: "Locked. Sending sketch in chat." },
  ];
  return (
    <Shell icon={MessageSquare} title="Real-time messaging">
      <div className="w-full max-w-md space-y-3">
        {msgs.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className={`flex ${m.me ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-snug border ${
                m.me
                  ? "bg-white !text-black border-white rounded-br-sm"
                  : "bg-black !text-white border-white/20 rounded-bl-sm"
              }`}
            >
              <div
                className={`mb-0.5 text-[10px] uppercase tracking-wide ${
                  m.me ? "!text-black/70" : "!text-white/70"
                }`}
              >
                {m.name}
              </div>
              <div>{m.text}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 flex gap-2 justify-center">
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

export function FiltersCard() {
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
    <Shell icon={Filter} title="Fast, powerful filters">
      <div className="w-full flex flex-col items-center justify-center gap-2 text-center">
        {chips.map((c, i) => (
          <motion.div
            key={c}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs"
          >
            {c}
          </motion.div>
        ))}
      </div>

      <div className="mt-6 w-full flex items-center justify-center">
        <div className="w-full max-w-md">
          <Progress value={82} className="h-2 bg-white/5" />
        </div>
      </div>

      <p className="mt-2 text-xs text-white/60 text-center">
        82 artists match. Refine in seconds.
      </p>
    </Shell>
  );
}

export function RewardsCard() {
  const points = 1240;

  const milestones = [
    { level: 1, at: 500, reward: "$5 off" },
    { level: 2, at: 1000, reward: "$10 off" },
    { level: 3, at: 2000, reward: "$20 off" },
    { level: 4, at: 3500, reward: "Flash token" },
    { level: 5, at: 5000, reward: "$50 off" },
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

  return (
    <Shell icon={Gift} title="Rewards & progression">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center">
          <div className="text-sm text-white/70">Current points</div>
          <div className="mt-1 text-3xl font-extrabold">
            {points.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-white/60">
            Level {prev.level} → {next.level}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative h-24 w-24 rounded-full grid place-items-center"
            style={{
              background: `conic-gradient(white ${
                pctToNext * 3.6
              }deg, rgba(255,255,255,0.15) 0deg)`,
            }}
          >
            <div className="absolute inset-2 rounded-full bg-black/60 backdrop-blur" />
            <div className="relative text-sm font-semibold">{pctToNext}%</div>
          </div>

          <div className="w-full max-w-md">
            <Progress value={pctToNext} className="h-2 bg-white/5" />
            <div className="mt-2 flex items-center justify-between text-xs text-white/70">
              <span>{prev.at.toLocaleString()} pts</span>
              <span>{next.at.toLocaleString()} pts</span>
            </div>
          </div>

          <p className="text-xs text-white/80">
            {next.at - points > 0
              ? `${(next.at - points).toLocaleString()} points to ${
                  next.reward
                }`
              : `Maxed this tier. Keep earning.`}
          </p>
        </div>

        <div className="w-full max-w-xl">
          <div className="flex items-center justify-between">
            {milestones.map((m, i) => {
              const achieved = points >= m.at;
              return (
                <div key={m.at} className="flex flex-col items-center w-full">
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`h-3 w-3 rounded-full border ${
                        achieved
                          ? "bg-white border-white"
                          : "bg-black border-white/40"
                      }`}
                    />
                    {i < milestones.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-3 h-[2px] w-[calc(100%-0.75rem)] ${
                          achieved ? "bg-white" : "bg-white/30"
                        }`}
                      />
                    )}
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-wide text-white/70">
                    L{m.level}
                  </div>
                  <div className="mt-1 text-xs font-semibold">{m.reward}</div>
                  <div className="text-[11px] text-white/60">
                    {m.at.toLocaleString()} pts
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-md">
          {milestones
            .filter((m) => points >= m.at)
            .slice(-3)
            .map((m, i) => (
              <motion.div
                key={`perk-${m.at}`}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3 text-center text-xs"
              >
                {m.reward}
              </motion.div>
            ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80"
          >
            Book to earn
          </Badge>
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80"
          >
            Bonuses on reviews
          </Badge>
          <Badge
            variant="outline"
            className="bg-white/5 border-white/15 text-white/80"
          >
            Streak multipliers
          </Badge>
        </div>
      </div>
    </Shell>
  );
}

export function FlashDealsCard() {
  const deals = [
    {
      title: "Mini rose",
      price: 80,
      artist: "Aiko S.",
      style: "Fine-line",
      city: "NYC",
      ends: "3h left",
    },
    {
      title: "Script word",
      price: 120,
      artist: "Marco T.",
      style: "Lettering",
      city: "LA",
      ends: "Today",
    },
    {
      title: "Flash sheet pick",
      price: 150,
      artist: "Nina K.",
      style: "Traditional",
      city: "Chicago",
      ends: "6h left",
    },
    {
      title: "Linework special",
      price: 99,
      artist: "Evan R.",
      style: "Blackwork",
      city: "SF",
      ends: "2h left",
    },
    {
      title: "Butterfly micro",
      price: 140,
      artist: "Yumi H.",
      style: "Fine-line",
      city: "Miami",
      ends: "Tomorrow",
    },
    {
      title: "Geometric band",
      price: 180,
      artist: "Leo V.",
      style: "Geometric",
      city: "NYC",
      ends: "4h left",
    },
  ];

  return (
    <Shell icon={Zap} title="Flash deals & early access">
      <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        {deals.map((d, i) => (
          <motion.div
            key={`${d.artist}-${i}`}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="rounded-lg border border-white/15 bg-white/[0.06] p-4 text-left"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{d.title}</h3>
              <span className="text-lg font-extrabold">${d.price}</span>
            </div>
            <div className="mt-2 text-xs text-white/70">
              <span className="mr-2">{d.artist}</span>·
              <span className="mx-2">{d.style}</span>·
              <span className="ml-2">{d.city}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-white/60">{d.ends}</span>
              <button className="rounded-md px-3 py-1.5 text-xs font-semibold bg-white text-black hover:opacity-90">
                Claim
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-xs text-white/60 text-center">
        Members see drops first. Limited slots.
      </p>
    </Shell>
  );
}

export function LoyaltyCard() {
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
    <Shell icon={Crown} title="Loyalty tiers">
      <div className="w-full max-w-2xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-8 items-stretch">
        <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/70">Current tier</div>
              <div className="text-2xl font-extrabold">{current.name}</div>
              <div className="mt-1 text-xs text-white/60">
                {points.toLocaleString()} pts
              </div>
            </div>

            <div
              className="relative h-24 w-24 rounded-full grid place-items-center"
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

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-white/70">
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
            <div className="mt-2 text-xs text-white/80">
              {current.name === "Ink Elite"
                ? "You’re at the top tier."
                : `${(next.min - points).toLocaleString()} points to ${
                    next.name
                  }`}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm mb-2">Your perks</div>
            <div className="flex flex-wrap gap-2">
              {perksByTier[current.name].map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Badge
              variant="outline"
              className="bg-white/5 border-white/15 text-white/80"
            >
              Earn by booking
            </Badge>
            <Badge
              variant="outline"
              className="bg-white/5 border-white/15 text-white/80"
            >
              Bonus on reviews
            </Badge>
            <Badge
              variant="outline"
              className="bg-white/5 border-white/15 text-white/80"
            >
              Streak multipliers
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {tiers.map((t) => {
            const active = t.name === current.name;
            const achieved = points >= t.min;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25 }}
                className={`relative rounded-xl border px-4 py-3 ${
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
                      width: `${
                        achieved
                          ? 100
                          : Math.max(
                              0,
                              Math.min(
                                100,
                                ((points - t.min) / (t.max - t.min)) * 100
                              )
                            )
                      }%`,
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

export function PreferencesCard() {
  return (
    <Shell icon={SlidersHorizontal} title="Signup preferences">
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <div className="space-y-2">
          <p className="text-xs text-white/70">Style</p>
          <Select>
            <SelectTrigger className="w-full bg-white/10 border-white/15 text-white">
              <SelectValue placeholder="Choose styles" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/15 text-white">
              <SelectItem value="fine-line">Fine-line</SelectItem>
              <SelectItem value="blackwork">Blackwork</SelectItem>
              <SelectItem value="traditional">Traditional</SelectItem>
              <SelectItem value="neo-traditional">Neo-traditional</SelectItem>
              <SelectItem value="japanese">Japanese</SelectItem>
              <SelectItem value="realism">Realism</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-white/70">Budget</p>
          <Select>
            <SelectTrigger className="w-full bg-white/10 border-white/15 text-white">
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/15 text-white">
              <SelectItem value="100-200">$100–$200</SelectItem>
              <SelectItem value="200-400">$200–$400</SelectItem>
              <SelectItem value="400-800">$400–$800</SelectItem>
              <SelectItem value="800plus">$800+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-white/70">City</p>
          <Select>
            <SelectTrigger className="w-full bg-white/10 border-white/15 text-white">
              <SelectValue placeholder="Pick a city" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/15 text-white">
              <SelectItem value="nyc">New York City</SelectItem>
              <SelectItem value="la">Los Angeles</SelectItem>
              <SelectItem value="chi">Chicago</SelectItem>
              <SelectItem value="mia">Miami</SelectItem>
              <SelectItem value="sf">San Francisco</SelectItem>
              <SelectItem value="remote">Open to travel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-white/70">Availability</p>
          <Select>
            <SelectTrigger className="w-full bg-white/10 border-white/15 text-white">
              <SelectValue placeholder="When are you free?" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/15 text-white">
              <SelectItem value="asap">ASAP</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="weekends">Weekends</SelectItem>
              <SelectItem value="evenings">Evenings</SelectItem>
              <SelectItem value="next-month">Next month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex gap-2 justify-center">
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80"
        >
          Client
        </Badge>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80"
        >
          Preset profile
        </Badge>
      </div>
    </Shell>
  );
}

export function GalleryCard() {
  const imgs = [
    { src: Blackwork, label: "Blackwork" },
    { src: FineLine, label: "Fine-line" },
    { src: ColorRealism, label: "Color realism" },
    { src: Lettering, label: "Lettering" },
    { src: Geometric, label: "Geometric" },
    { src: Traditional, label: "Traditional" },
  ];

  return (
    <Shell icon={Images} title="Gallery access">
      <div className="mx-auto w-full max-w-2xl [perspective:1200px]">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 place-items-center">
          {imgs.map((img, i) => (
            <motion.figure
              key={img.src}
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
              className="group relative aspect-square w-full max-w-[260px] rounded-xl border border-white/15 bg-black overflow-visible"
              style={{ transformStyle: "preserve-3d", willChange: "transform" }}
            >
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <img
                  src={img.src}
                  alt={`${img.label} tattoo`}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 50vw, 33vw"
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

      <div className="mt-6 flex gap-2 justify-center">
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80"
        >
          Browse styles
        </Badge>
        <Badge
          variant="outline"
          className="bg-white/5 border-white/15 text-white/80"
        >
          Save favorites
        </Badge>
      </div>
    </Shell>
  );
}

export function AnalyticsCard() {
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

  const nextOpenings = [
    { when: "Thu 2:30p", len: "1h" },
    { when: "Fri 11:00a", len: "2h" },
    { when: "Mon 4:00p", len: "1.5h" },
  ];

  const maxBookings = Math.max(...bars.map((b) => b.bookings)) || 1;
  const maxRevenue = Math.max(...bars.map((b) => b.revenue)) || 1;

  return (
    <Shell icon={BarChart3} title="Artist analytics">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3"
            >
              <div className="text-[11px] text-white/70">{k.label}</div>
              <div className="mt-1 text-lg font-semibold">{k.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm text-white/80 mb-2">Bookings (7d)</h4>
            <div className="flex items-end justify-between gap-2 h-28 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              {bars.map((b, i) => (
                <motion.div
                  key={`b-${i}`}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="w-6 origin-bottom"
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
            <div className="mt-2 flex justify-between text-[11px] text-white/60 px-1">
              {bars.map((b, i) => (
                <span key={`bl-${i}`}>{b.day}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm text-white/80 mb-2">Revenue (7d)</h4>
            <div className="flex items-end justify-between gap-2 h-28 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              {bars.map((b, i) => (
                <motion.div
                  key={`r-${i}`}
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="w-6 origin-bottom"
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
            <div className="mt-2 flex justify-between text-[11px] text-white/60 px-1">
              {bars.map((b, i) => (
                <span key={`rl-${i}`}>{b.day}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Metric label="Utilization" value={`${utilization}%`}>
              <Progress value={utilization} className="h-2 bg-white/5" />
            </Metric>
            <Metric label="Return clients" value={`${returnRate}%`}>
              <Progress value={returnRate} className="h-2 bg-white/5" />
            </Metric>
            <Metric label="No-show rate" value={`${noShow}%`}>
              <Progress value={noShow} className="h-2 bg-white/5" />
            </Metric>
            <Metric label="Avg response" value={`${responseMins}m`}>
              <div className="text-[11px] text-white/60">
                Goal &lt; 15m. Faster replies rank higher.
              </div>
            </Metric>
          </div>

          <div className="space-y-4">
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

            <div className="rounded-lg border border-white/15 bg-white/[0.06] p-3">
              <div className="text-sm mb-2">Next openings</div>
              <ul className="text-xs text-white/80 space-y-1">
                {nextOpenings.map((o) => (
                  <li
                    key={o.when}
                    className="flex items-center justify-between"
                  >
                    <span>{o.when}</span>
                    <span className="text-white/60">{o.len}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge
            className="bg-white/5 border-white/15 text-white/80"
            variant="outline"
          >
            Manage payouts
          </Badge>
          <Badge
            className="bg-white/5 border-white/15 text-white/80"
            variant="outline"
          >
            Improve ranking
          </Badge>
        </div>
      </div>
    </Shell>
  );
}

function Metric({ label, value, children }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section className="container mx-auto max-w-3xl px-4 pb-16 flex flex-col items-center justify-center text-center">
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.6))]">
        Our Features
      </h2>
      <Separator className="mx-auto mt-4 bg-white/20 w-48" />
      <div className="mt-8 flex w-full flex-col items-center justify-center gap-8">
        <MessagingCard />
        <FiltersCard />
        <PreferencesCard />
        <GalleryCard />
        <AnalyticsCard />
        <RewardsCard />
        <FlashDealsCard />
        <LoyaltyCard />
      </div>
    </section>
  );
}
