import { StatusIndicator } from "./StatusIndicator";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            Sentiment Inference
          </h1>
          <p className="text-xs text-zinc-500">DistilBERT on FastAPI</p>
        </div>
        <StatusIndicator />
      </div>
    </header>
  );
}
