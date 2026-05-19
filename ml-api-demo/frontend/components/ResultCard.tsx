"use client";

import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import type { PredictResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  result: PredictResponse;
  text: string;
}

const SPRING = { type: "spring", stiffness: 200, damping: 25 } as const;

export function ResultCard({ result, text }: ResultCardProps) {
  const top = result.predictions[0];
  if (!top) return null;

  const label = top.label.toUpperCase();
  const isPositive = label === "POSITIVE";
  const isNegative = label === "NEGATIVE";

  const pillClasses = isPositive
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : isNegative
    ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
    : "border-zinc-700 bg-zinc-800/60 text-zinc-300";

  const barClasses = isPositive
    ? "bg-emerald-500"
    : isNegative
    ? "bg-rose-500"
    : "bg-zinc-400";

  const scorePct = top.score * 100;

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 p-6">
      <motion.div layout transition={SPRING} className="space-y-5">
        <blockquote className="border-l-2 border-zinc-800 pl-4 text-sm italic text-zinc-400">
          &ldquo;{text}&rdquo;
        </blockquote>

        <div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium",
              pillClasses
            )}
          >
            {top.label}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              Confidence
            </span>
            <span className="text-sm font-medium tabular-nums text-zinc-200">
              {scorePct.toFixed(1)}%
            </span>
          </div>
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-900"
            role="progressbar"
            aria-valuenow={Math.round(scorePct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Prediction confidence"
          >
            <motion.div
              className={cn("h-full rounded-full", barClasses)}
              initial={{ width: 0 }}
              animate={{ width: `${scorePct}%` }}
              transition={SPRING}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 text-xs text-zinc-500">
          <span>Inference: {Math.round(result.inference_ms)}ms</span>
          <span className="truncate font-mono">{result.model}</span>
        </div>
      </motion.div>
    </Card>
  );
}
