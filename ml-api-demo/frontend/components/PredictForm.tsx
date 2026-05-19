"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

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

interface PredictFormProps {
  prefillText?: string | null;
}

export function PredictForm({ prefillText = null }: PredictFormProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [resultText, setResultText] = useState("");
  const [submissionId, setSubmissionId] = useState(0);

  useEffect(() => {
    if (prefillText !== null) {
      setText(prefillText);
      // Clear stale result so users see a fresh form ready to resubmit.
      setResult(null);
      setError(null);
    }
  }, [prefillText]);

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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("history-updated"));
        }
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

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (canSubmit) {
        formRef.current?.requestSubmit();
      }
    }
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <ExampleChips onSelect={setText} disabled={loading} />

        <div className="space-y-2">
          <label htmlFor="predict-input" className="sr-only">
            Text to classify
          </label>
          <Textarea
            id="predict-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Enter text to classify..."
            className="min-h-[120px] resize-none border-zinc-800 bg-zinc-900/40 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-700"
            disabled={loading}
            maxLength={MAX_CHARS + 100}
            aria-describedby="predict-input-help"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span id="predict-input-help" className="flex items-center gap-1 text-zinc-600">
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                ⌘
              </kbd>
              <span aria-hidden>+</span>
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                Enter
              </kbd>
              <span className="pl-1">to submit</span>
            </span>
            <span className={cn("tabular-nums", charColor)} aria-live="polite">
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
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
