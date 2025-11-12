"use client";
import React, { useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  MessagingCard,
  FiltersCard,
  RewardsCard,
  FlashDealsCard,
  LoyaltyCard,
  PreferencesCard,
  GalleryCard,
} from "./FeatureCards";

export default function FeatureShowcase() {
  const [mobileRole, setMobileRole] = useState("client");
  return (
    <section className="container mx-auto max-w-6xl px-4 pb-4 md:pb-6">
      <h2 className="text-center text-2xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(180deg,#fff,rgba(255,255,255,.6))]">
        Our Features
      </h2>
      <div className="py-3 md:py-4">
        <Separator className="mx-auto bg-white/20 w-40 md:w-48" />
      </div>

      <div className="mt-6 md:mt-8">
        <div className="mb-3 md:mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-[11px] md:text-xs uppercase tracking-wide font-semibold">
            <span className="opacity-80">Shared</span>
            <span className="h-1 w-1 rounded-full bg-white/50" />
            <span>Real-time messaging</span>
          </div>
        </div>
        <MessagingCard compact />
      </div>

      <div className="mt-6 md:hidden">
        <div className="mx-auto w-full max-w-xs">
          <div className="flex rounded-full border border-white/15 bg-white/[0.06] p-1">
            <button
              onClick={() => setMobileRole("client")}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                mobileRole === "client" ? "bg-white !text-black" : "text-white"
              }`}
            >
              Client
            </button>
            <button
              onClick={() => setMobileRole("artist")}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                mobileRole === "artist" ? "bg-white !text-black" : "text-white"
              }`}
            >
              Artist
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
        <div
          className={`${
            mobileRole === "client" ? "flex" : "hidden"
          } md:flex flex-col items-stretch gap-6 md:gap-8`}
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-sm md:text-base font-extrabold uppercase tracking-wide">
              Client
            </div>
          </div>
          <FiltersCard compact />
          <PreferencesCard compact />
          <GalleryCard compact />
          <RewardsCard compact />
        </div>

        <div
          className={`${
            mobileRole === "artist" ? "flex" : "hidden"
          } md:flex flex-col items-stretch gap-6 md:gap-8`}
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-sm md:text-base font-extrabold uppercase tracking-wide">
              Artist
            </div>
          </div>
          <AnalyticsCard compact />
          <LoyaltyCard compact />
          <FlashDealsCard compact />
        </div>
      </div>
    </section>
  );
}

import { AnalyticsCard } from "./FeatureCards";