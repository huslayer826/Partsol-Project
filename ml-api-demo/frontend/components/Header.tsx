"use client";

import { cn } from "@/lib/utils";

type Status = "operational" | "degraded" | "down";

interface HeaderProps {
  status?: Status;
}

export function Header({ status = "operational" }: HeaderProps) {
  const label =
    status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Down";
  const dot =
    status === "operational"
      ? "bg-emerald-500"
      : status === "degraded"
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            Sentiment Inference
          </h1>
          <p className="text-xs text-zinc-500">DistilBERT on FastAPI</p>
        </div>

        <div
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400"
          role="status"
          aria-label={`Model status: ${label}`}
        >
          <span className="relative flex h-2 w-2" aria-hidden>
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                dot
              )}
            />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", dot)} />
          </span>
          <span>{label}</span>
        </div>
      </div>
    </header>
  );
}
