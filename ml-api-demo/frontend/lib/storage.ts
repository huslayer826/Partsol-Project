import type { HistoryEntry } from "@/lib/types";

const STORAGE_KEY = "ml-demo-history";
const MAX_ENTRIES = 20;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getHistory(): HistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): void {
  if (!isBrowser()) return;
  const next = [entry, ...getHistory()].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded or localStorage disabled — silently ignore.
  }
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
