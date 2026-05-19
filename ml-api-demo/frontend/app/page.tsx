import { Header } from "@/components/Header";
import { PredictForm } from "@/components/PredictForm";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <div className="mb-10 space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100">
            Analyze sentiment
          </h2>
          <p className="text-sm text-zinc-400">
            Paste any English text. The model classifies it as positive or negative
            and reports its confidence.
          </p>
        </div>
        <PredictForm />
      </main>
    </>
  );
}
