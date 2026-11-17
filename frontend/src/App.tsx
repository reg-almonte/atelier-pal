import { AlertTriangle, Calculator, RefreshCw, Shuffle, Sparkles } from 'lucide-react';
import { ColorSelectorPanel } from './presentation/components/ColorSelectorPanel';
import { FloatingPreviewLink } from './presentation/components/FloatingPreviewLink';
import { HumanModelStage } from './presentation/components/HumanModelStage';
import { OllamaSetupModal } from './presentation/components/OllamaSetupModal';
import { OutfitCard } from './presentation/components/OutfitCard';
import { SavedLooksDrawer } from './presentation/components/SavedLooksDrawer';
import { TopNav } from './presentation/components/TopNav';
import { useStylingStudio, type SourceFilter } from './presentation/hooks/useStylingStudio';

const FILTER_TABS: { id: SourceFilter; label: string }[] = [
  { id: 'all', label: 'All Engines' },
  { id: 'math_engine', label: 'Computed (Math)' },
  { id: 'ollama_ai', label: 'AI Generated' },
];

export function App() {
  const studio = useStylingStudio();

  const showComputed =
    studio.sourceFilter === 'all' || studio.sourceFilter === 'math_engine';
  const showAI =
    studio.sourceFilter === 'all' || studio.sourceFilter === 'ollama_ai';

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F4EF] text-[#1C1B18]">
      <TopNav
        aiStatus={studio.aiStatus}
        savedCount={studio.savedLooks.length}
        onOpenSavedDrawer={() => studio.setIsDrawerOpen(true)}
        onOpenOllamaModal={() => studio.setIsOllamaModalOpen(true)}
      />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-5 sm:px-5">
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[260px_1fr] min-[1141px]:grid-cols-[270px_minmax(340px,400px)_1fr]">
          <div>
            <ColorSelectorPanel
              palette={studio.palette}
              activeSlot={studio.activeSlot}
              lockedTokens={studio.lockedTokens}
              lockedCount={studio.lockedCount}
              activeRecommendation={studio.activeRecommendation}
              customMatch={studio.customMatch}
              occasion={studio.occasion}
              onSelectSlot={studio.setActiveSlot}
              onUnlockSlot={studio.unlockSlot}
              onResetLocks={studio.resetAllLocks}
              onSelectToken={studio.selectToken}
              onMatchCustomHex={studio.matchCustomHex}
              onChangeOccasion={studio.setOccasion}
            />
          </div>

          <HumanModelStage
            recommendation={studio.activeRecommendation}
            selectedSkinTone={studio.selectedSkinTone}
            selectedBelt={studio.selectedBelt}
            isSaved={
              studio.activeRecommendation
                ? studio.savedLookIds.has(studio.activeRecommendation.id)
                : false
            }
            activeSlot={studio.activeSlot}
            lockedSlots={studio.lockedSlots}
            onSelectSlot={studio.setActiveSlot}
            onSelectSkinTone={studio.setSelectedSkinTone}
            onSelectBelt={studio.setSelectedBelt}
            onSave={studio.saveLook}
          />

          <section className="min-w-0 space-y-6 md:col-span-2 min-[1141px]:col-span-1">
            {/* Source Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => studio.setSourceFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      studio.sourceFilter === tab.id
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {showComputed && (
                  <button
                    type="button"
                    onClick={studio.remixComputed}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Remix Computed
                  </button>
                )}
                {showAI && (
                  <button
                    type="button"
                    onClick={studio.regenerateAI}
                    disabled={studio.aiLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${studio.aiLoading ? 'animate-spin' : ''}`}
                    />
                    Regenerate AI Ideas
                  </button>
                )}
              </div>
            </div>

            {studio.computedError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                {studio.computedError}
              </div>
            )}

            {studio.lockedCount === 0 && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-6 text-center text-xs text-stone-600">
                Select any garment slot on the left (Top, Bottom, Outerwear, or Footwear) and pick a color to start building your outfit.
              </div>
            )}

            {/* Track A: Computed Color Math */}
            {showComputed && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-sky-700" />
                    <h2 className="font-serif text-lg font-semibold text-stone-900">
                      Track A · Computed Color Math
                    </h2>
                  </div>
                  <span className="text-xs text-stone-500">
                    Deterministic CIELAB + 60-30-10 Rules
                  </span>
                </div>

                {studio.computedLoading && studio.computedRecs.length === 0 ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-stone-100"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {studio.computedRecs.map((rec) => (
                      <OutfitCard
                        key={rec.id}
                        recommendation={rec}
                        isSaved={studio.savedLookIds.has(rec.id)}
                        isActive={studio.activeRecommendationId === rec.id}
                        lockedSlots={studio.lockedSlots}
                        onSelect={studio.selectRecommendation}
                        onToggleLock={studio.toggleLockSlot}
                        onSave={studio.saveLook}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Track B: Independent AI-Generated Pairings */}
            {showAI && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-700" />
                    <h2 className="font-serif text-lg font-semibold text-stone-900">
                      Track B · Independent AI Stylist
                    </h2>
                  </div>
                  <span className="text-xs text-stone-500">
                    {studio.aiStatus?.active_model
                      ? `Local Ollama (${studio.aiStatus.active_model})`
                      : 'Local Ollama'}
                  </span>
                </div>

                {studio.aiLoading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="h-64 animate-pulse rounded-2xl border border-violet-200 bg-violet-50/50 p-5"
                      >
                        <div className="h-5 w-36 rounded-full bg-violet-200/70" />
                        <div className="mt-4 h-4 w-48 rounded bg-violet-200/50" />
                        <div className="mt-6 space-y-2">
                          <div className="h-10 rounded-xl bg-violet-100" />
                          <div className="h-10 rounded-xl bg-violet-100" />
                          <div className="h-10 rounded-xl bg-violet-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : studio.aiError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                          <h3 className="text-sm font-semibold text-amber-900">
                            AI Stylist Offline — Computed Track Active
                          </h3>
                          <p className="mt-1 text-xs text-amber-800">
                            {studio.aiError.message}
                          </p>
                          {studio.aiError.setupHint && (
                            <p className="mt-1.5 font-mono text-[11px] text-amber-900">
                              {studio.aiError.setupHint}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => studio.setIsOllamaModalOpen(true)}
                        className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
                      >
                        Setup Guide
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {studio.aiRecs.map((rec) => (
                      <OutfitCard
                        key={rec.id}
                        recommendation={rec}
                        isSaved={studio.savedLookIds.has(rec.id)}
                        isActive={studio.activeRecommendationId === rec.id}
                        lockedSlots={studio.lockedSlots}
                        onSelect={studio.selectRecommendation}
                        onToggleLock={studio.toggleLockSlot}
                        onSave={studio.saveLook}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white py-3 text-center text-xs text-stone-500">
        Atelier Pal · Personal Styling Companion · <span className="font-mono">v0.0.1</span> ·
        Hexagonal Architecture (FastAPI + React + Ollama)
      </footer>

      <SavedLooksDrawer
        isOpen={studio.isDrawerOpen}
        looks={studio.savedLooks}
        onClose={() => studio.setIsDrawerOpen(false)}
        onDeleteLook={studio.deleteSavedLook}
      />

      <OllamaSetupModal
        isOpen={studio.isOllamaModalOpen}
        aiStatus={studio.aiStatus}
        onClose={() => studio.setIsOllamaModalOpen(false)}
        onRefresh={() => void studio.refreshAIStatus()}
      />

      <FloatingPreviewLink />
    </div>
  );
}

export default App;
