import { Bookmark, BookmarkCheck, Calculator, Lock, Sparkles, Unlock } from 'lucide-react';
import {
  isComputedSource,
  SLOT_LABELS,
  STRATEGY_LABELS,
  type GarmentSlot,
  type OutfitRecommendation,
} from '../../domain/models';

interface OutfitCardProps {
  recommendation: OutfitRecommendation;
  isSaved: boolean;
  lockedSlots: Partial<Record<GarmentSlot, string>>;
  onToggleLock?: (slot: GarmentSlot, tokenId: string) => void;
  onSave: (rec: OutfitRecommendation) => void;
}

export function OutfitCard({
  recommendation,
  isSaved,
  lockedSlots,
  onToggleLock,
  onSave,
}: OutfitCardProps) {
  const computed = isComputedSource(recommendation.source);

  return (
    <article
      className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        computed ? 'border-stone-200' : 'border-violet-200/80 bg-gradient-to-b from-violet-50/20 to-white'
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              computed
                ? 'bg-sky-100 text-sky-900'
                : 'bg-violet-100 text-violet-900'
            }`}
          >
            {computed ? (
              <Calculator className="h-3 w-3" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {computed ? 'Computed · Color Math' : recommendation.source_label}
          </span>

          <button
            type="button"
            onClick={() => onSave(recommendation)}
            aria-label={isSaved ? 'Saved look' : 'Save look'}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition ${
              isSaved
                ? 'border-stone-900 bg-stone-900 text-white'
                : 'border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </button>
        </div>

        <h3 className="mt-3 font-serif text-base font-semibold text-stone-900">
          {STRATEGY_LABELS[recommendation.strategy]}
        </h3>

        {/* 60-30-10 Visual Proportion Bar */}
        <div className="mt-3">
          <div className="flex h-4 overflow-hidden rounded-full border border-stone-200 shadow-inner">
            {recommendation.items.map((item, idx) => (
              <div
                key={`${item.slot}-${idx}`}
                style={{
                  width: `${item.proportion_percentage}%`,
                  backgroundColor: item.hex,
                }}
                title={`${SLOT_LABELS[item.slot]}: ${item.color_name} (${item.proportion_percentage}%)`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-stone-400">
            <span>Proportion Breakdown</span>
            <span>
              {recommendation.items.map((i) => `${i.proportion_percentage}%`).join(' / ')}
            </span>
          </div>
        </div>

        {/* Garment Slots */}
        <ul className="mt-4 space-y-2">
          {recommendation.items.map((item, idx) => {
            const isLocked = lockedSlots[item.slot] === item.matched_token_id;
            return (
              <li
                key={`${item.slot}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-6 w-6 rounded-md border border-stone-300 shadow-sm"
                    style={{ backgroundColor: item.hex }}
                  />
                  <div>
                    <p className="text-xs font-semibold text-stone-800">
                      {item.color_name}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {SLOT_LABELS[item.slot]} · {item.proportion_percentage}%
                    </p>
                  </div>
                </div>

                {computed && onToggleLock && (
                  <button
                    type="button"
                    onClick={() => onToggleLock(item.slot, item.matched_token_id)}
                    title={isLocked ? 'Unlock slot' : 'Lock slot for remix'}
                    className={`rounded-md p-1.5 transition ${
                      isLocked
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-400 hover:bg-stone-200 hover:text-stone-700'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <p className="text-xs leading-relaxed text-stone-600">
          {recommendation.styling_rationale}
        </p>
        {recommendation.fabric_texture_tip && (
          <p className="mt-1.5 text-[11px] italic text-stone-500">
            Texture tip: {recommendation.fabric_texture_tip}
          </p>
        )}
      </div>
    </article>
  );
}
