import React from "react";
import Header from "@/components/header/Header";
import VideoBackground from "@/components/VideoBackground";

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
          <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5 sm:p-7">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{title}</h1>
            <p className="text-xs text-muted mb-6">Last updated: {updated}</p>
            <div className="space-y-3 text-sm leading-relaxed text-app/85 [&_h2]:mt-6 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-app [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
