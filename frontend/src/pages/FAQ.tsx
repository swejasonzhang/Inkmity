import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle } from "lucide-react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import { usePageMeta } from "@/hooks/usePageMeta";

type QA = { q: string; a: string };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
  {
    title: "Booking & sessions",
    items: [
      {
        q: "How does booking work on Inkmity?",
        a: "Browse artists by style, message with your references, then book a time. For a tattoo session you complete a short consent waiver and health intake first; consultations skip those. A deposit is collected at booking, and the remaining balance is captured only after both you and your artist confirm the session is complete.",
      },
      {
        q: "What do I need before a tattoo session?",
        a: "A signed consent/liability waiver and a completed health intake form — both are required and enforced before a tattoo booking. Consultations are exempt. You must also be 18 or older.",
      },
      {
        q: "Can I just book a consultation first?",
        a: "Yes. Consultations are free and skip the waiver, intake, and deposit — a low-pressure way to talk through your idea before committing to a full session.",
      },
    ],
  },
  {
    title: "Payments, fees & deposits",
    items: [
      {
        q: "What does Inkmity cost?",
        a: "The essentials — discovery, messaging, booking, intake, sketch approval, and reviews — are free. Inkmity earns a single transparent platform fee on completed bookings, shown before you pay, and it drops as low as 5% the more you book.",
      },
      {
        q: "When am I charged?",
        a: "A deposit is collected when you book. The remaining balance is captured only after both you and the artist verify the session is complete.",
      },
      {
        q: "Are deposits refundable?",
        a: "Each artist sets their own deposit policy and cancellation terms, shown before you pay. Deposits may be forfeited for late cancellations or no-shows — check the artist's policy on the booking screen.",
      },
      {
        q: "Do tips go to the artist?",
        a: "100%. Tips are optional, processed after a completed session, and go entirely to the artist — Inkmity takes nothing from them.",
      },
    ],
  },
  {
    title: "Trust & safety",
    items: [
      {
        q: "Are the reviews real?",
        a: "Yes. Reviews are verified — only a client with a completed booking can leave one, and it's limited to one review per booking.",
      },
      {
        q: "What happens with a no-show or dispute?",
        a: "Both sides can check in around the appointment time. If there's a no-show dispute, the artist can accept it (deposit refunded) or escalate to Inkmity to resolve, using each side's check-in as evidence.",
      },
      {
        q: "Is my personal information safe?",
        a: "Your health intake is shared only with your artist to prepare for the session, and you can delete it. Tattoo bookings are gated to clients 18 and older.",
      },
    ],
  },
  {
    title: "For artists & studios",
    items: [
      {
        q: "How do artists get paid?",
        a: "Connect a Stripe account during setup. Payouts go to you — split with your studio when applicable — with completion-based balance capture and chargeback protection.",
      },
      {
        q: "What does it cost to join as an artist?",
        a: "Joining and the core tools are free. Inkmity's fee applies to completed bookings — we only earn when you do.",
      },
    ],
  },
  {
    title: "Your account",
    items: [
      {
        q: "How do I sign up?",
        a: "Create an account as a client, artist, or studio. Pick your path on signup and finish a short onboarding — artists add a portfolio, availability, payout, and deposit policy.",
      },
    ],
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SECTIONS.flatMap((s) =>
    s.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  ),
};

export default function FAQ() {
  usePageMeta({
    title: "FAQ",
    description:
      "How Inkmity works — booking, fees, deposits, tips, safety, reviews, payouts, and accounts, answered for clients, artists, and studios.",
  });

  return (
    <div className="h-svh overflow-hidden flex flex-col text-app">
      <VideoBackground />
      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="flex items-center justify-center gap-2 mb-6 text-center">
            <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-1.5">
              <HelpCircle className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Frequently asked questions</h1>
          </div>

          <div className="space-y-5">
            {SECTIONS.map((section) => (
              <section key={section.title} className="rounded-2xl border border-app bg-card p-4 sm:p-5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-subtle mb-1">{section.title}</h2>
                <div className="divide-y divide-app/30">
                  {section.items.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 py-3 list-none [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-app">{item.q}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <p className="pb-3 text-xs leading-relaxed text-subtle">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-app bg-elevated/60 p-4 text-center">
            <p className="text-sm font-semibold text-app">Still have a question?</p>
            <p className="mt-1 text-xs text-subtle">We're happy to help — reach out and we'll get back to you.</p>
            <Link
              to="/contact"
              className="mt-3 inline-block rounded-xl bg-[color:var(--fg)] text-[color:var(--bg)] px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Contact us
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
