import React from "react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";
import { LEGAL_PROSE, LEGAL_SURFACE } from "@/components/legal/legalContent";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <VideoBackground />
      <div className="relative z-10 min-h-[100svh] flex flex-col text-app">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
          <div className={`rounded-2xl border border-[color:var(--border)] ${LEGAL_SURFACE} p-5 sm:p-7`}>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-app">{title}</h1>
            <p className="text-xs text-muted mb-6">Last updated: {updated}</p>
            <div className={LEGAL_PROSE}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
