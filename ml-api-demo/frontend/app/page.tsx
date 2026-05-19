"use client";

import { useState } from "react";

import { Header } from "@/components/Header";
import { HistorySidebar } from "@/components/HistorySidebar";
import { PredictForm } from "@/components/PredictForm";

export default function Home() {
  const [prefillText, setPrefillText] = useState<string | null>(null);

  function handleHistorySelect(text: string) {
    // Force a fresh prop identity even if the user re-selects the same item:
    // null -> text in two render passes so PredictForm's effect re-fires.
    setPrefillText(null);
    setTimeout(() => setPrefillText(text), 0);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mb-10 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Analyze sentiment
          </h2>
          <p className="text-sm text-zinc-400">
            Paste any English text. The model classifies it as positive or negative
            and reports its confidence.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <PredictForm prefillText={prefillText} />
          </div>
          <div className="md:col-span-1">
            <HistorySidebar onSelect={handleHistorySelect} />
          </div>
        </div>
      </main>
    </>
  );
}
