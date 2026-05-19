"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ApiError, predictText } from "@/lib/api";
import { addToHistory } from "@/lib/storage";
import type { PredictResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ExampleChips } from "./ExampleChips";
import { ResultCard } from "./ResultCard";

const MAX_CHARS = 5000;
const WARN_CHARS = 4000;
const SPRING = { type: "spring", stiffness: 200, damping: 25 } as const;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PredictForm() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [resultText, setResultText] = useState("");
  const [submissionId, setSubmissionId] = useState(0);

  const charColor =
    text.length > MAX_CHARS
      ? "text-rose-500"
      : text.length >= WARN_CHARS
      ? "text-amber-500"
      : "text-zinc-500";

  const canSubmit = text.trim().length > 0 && text.length <= MAX_CHARS && !loading;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const response = await predictText(text);
      setResult(response);
      setResultText(text);
      setSubmissionId((id) => id + 1);
      const top = response.predictions[0];
      if (top) {
        addToHistory({
          id: newId(),
          timestamp: Date.now(),
          text,
          prediction: top,
          inference_ms: response.inference_ms,
        });
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `Request failed (${err.status})`
          : err instanceof Error
          ? err.message
          : "Unknown error";
      setError(message);
      toast({
        variant: "destructive",
        title: "Inference failed",
        description: "Couldn't reach the model. Check the API or try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <ExampleChips onSelect={setText} disabled={loading} />

        <div className="space-y-2">
          <label htmlFor="predict-input" className="sr-only">
            Text to classify
          </label>
          <Textarea
            id="predict-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Enter text to classify..."
            className="min-h-[120px] resize-none border-zinc-800 bg-zinc-900/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
            disabled={loading}
            maxLength={MAX_CHARS + 100}
          />
          <div
            className={cn("text-right text-xs tabular-nums", charColor)}
            aria-live="polite"
          >
            {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 sm:w-auto sm:min-w-32"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Analyzing...
            </>
          ) : (
            "Analyze"
          )}
        </Button>
      </form>

      <div aria-live="polite">
        {result && (
          <motion.div
            key={submissionId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <ResultCard result={result} text={resultText} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
