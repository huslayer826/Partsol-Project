"use client";

const EXAMPLES = [
  "I love this product, it works exactly as described.",
  "Worst purchase I've made all year, complete waste of money.",
  "The customer service was incredibly helpful and patient.",
  "I'm extremely disappointed with the build quality.",
] as const;

interface ExampleChipsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export function ExampleChips({ onSelect, disabled }: ExampleChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Example inputs">
      {EXAMPLES.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          disabled={disabled}
          className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
