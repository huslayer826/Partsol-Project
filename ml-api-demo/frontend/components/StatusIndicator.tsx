"use client";

import { useEffect, useState } from "react";

import { checkHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "loading" | "operational" | "down";

const POLL_INTERVAL_MS = 10_000;

const CONFIG: Record<Status, { dot: string; label: string }> = {
  loading: { dot: "bg-zinc-500", label: "Checking..." },
  operational: { dot: "bg-emerald-500", label: "Operational" },
  down: { dot: "bg-rose-500", label: "Offline" },
};

export function StatusIndicator() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        await checkHealth();
        if (!cancelled) setStatus("operational");
      } catch {
        if (!cancelled) setStatus("down");
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const { dot, label } = CONFIG[status];

  return (
    <div
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400"
      role="status"
      aria-live="polite"
      aria-label={`Model status: ${label}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        {status === "loading" ? (
          <span className={cn("inline-block h-2 w-2 animate-pulse rounded-full", dot)} />
        ) : (
          <>
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                dot
              )}
            />
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", dot)} />
          </>
        )}
      </span>
      <span>{label}</span>
    </div>
  );
}
