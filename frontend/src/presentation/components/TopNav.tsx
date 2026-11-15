import { Bookmark, Cpu, Palette, Sparkles } from 'lucide-react';
import type { AIStatus } from '../../domain/models';

interface TopNavProps {
  aiStatus: AIStatus | null;
  savedCount: number;
  onOpenSavedDrawer: () => void;
  onOpenOllamaModal: () => void;
}

const FUTURE_TABS = ['My Closet', 'Outfit Planner', 'Style Profile'] as const;

export function TopNav({
  aiStatus,
  savedCount,
  onOpenSavedDrawer,
  onOpenOllamaModal,
}: TopNavProps) {
  const isConnected = aiStatus?.available ?? false;

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-stone-50">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight text-stone-900">
                Atelier Pal
              </span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                v0.0.1
              </span>
            </div>
            <p className="text-xs text-stone-500">Personal Styling Companion</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Color Studio
          </span>
          {FUTURE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              disabled
              title="Coming in v0.0.2+"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-stone-400"
            >
              {tab}
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400">
                v0.0.2+
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenOllamaModal}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <Cpu className="h-3.5 w-3.5" />
            <span>
              {isConnected
                ? `Ollama · ${aiStatus?.active_model}`
                : 'Ollama Offline'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSavedDrawer}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved Looks</span>
            <span className="rounded-full bg-stone-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {savedCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
