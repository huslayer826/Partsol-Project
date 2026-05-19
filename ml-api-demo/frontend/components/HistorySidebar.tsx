"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { clearHistory, getHistory } from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 200, damping: 25 } as const;
const TICK_MS = 30_000;

function formatRelative(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface HistorySidebarProps {
  onSelect: (text: string) => void;
}

export function HistorySidebar({ onSelect }: HistorySidebarProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  // tick state forces relative-time re-render without affecting other state
  const [, setTick] = useState(0);

  useEffect(() => {
    setEntries(getHistory());

    function refresh() {
      setEntries(getHistory());
    }
    window.addEventListener("history-updated", refresh);
    return () => {
      window.removeEventListener("history-updated", refresh);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  function handleClear() {
    clearHistory();
    setEntries([]);
  }

  return (
    <aside aria-label="Recent classifications" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Recent classifications</h2>
        {entries.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 gap-1 px-2 text-xs text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
            aria-label="Clear classification history"
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            Clear
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-zinc-500">No predictions yet.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {entries.map((entry) => {
              const label = entry.prediction.label.toUpperCase();
              const isPositive = label === "POSITIVE";
              const isNegative = label === "NEGATIVE";
              const pillClasses = isPositive
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : isNegative
                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-300";

              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={SPRING}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(entry.text)}
                    className="block w-full rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                    aria-label={`Reuse: ${entry.text.slice(0, 80)}`}
                  >
                    <p className="line-clamp-2 text-xs text-zinc-300">{entry.text}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          pillClasses
                        )}
                      >
                        {entry.prediction.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-zinc-500">
                        {(entry.prediction.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-[10px] text-zinc-600">
                      {formatRelative(entry.timestamp)}
                    </p>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </aside>
  );
}
