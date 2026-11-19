import { useEffect } from 'react';
import { Calculator, Sparkles, Trash2, X } from 'lucide-react';
import {
  FEMALE_STYLE_LABELS,
  isComputedSource,
  MODEL_SILHOUETTE_LABELS,
  OCCASION_LABELS,
  SLOT_LABELS,
  type SavedLook,
} from '../../domain/models';

interface SavedLooksDrawerProps {
  isOpen: boolean;
  looks: SavedLook[];
  onClose: () => void;
  onDeleteLook: (id: string) => void;
}

export function SavedLooksDrawer({
  isOpen,
  looks,
  onClose,
  onDeleteLook,
}: SavedLooksDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Looks"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              Saved Looks
            </h2>
            <p className="text-xs text-stone-500">
              Stored locally in IndexedDB with full provenance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Saved Looks"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {looks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
              <p className="text-sm font-medium text-stone-700">No saved looks yet</p>
              <p className="mt-1 text-xs text-stone-500">
                Click the bookmark icon on any Computed or AI-generated outfit card to save
                it here.
              </p>
            </div>
          ) : (
            looks.map((look) => {
              const computed = isComputedSource(look.recommendation.source);
              return (
                <div
                  key={look.id}
                  className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        computed
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {computed ? (
                        <Calculator className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {computed
                        ? 'Computed · Color Math'
                        : look.recommendation.source_label}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteLook(look.id)}
                      aria-label="Delete saved look"
                      className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-stone-300"
                      style={{ backgroundColor: look.base_token.hex }}
                    />
                    <span className="font-medium text-stone-800">
                      {look.base_token.name}
                    </span>
                    <span>·</span>
                    <span>{SLOT_LABELS[look.base_slot]}</span>
                    <span>·</span>
                    <span>{OCCASION_LABELS[look.occasion]}</span>
                    {look.model_silhouette && (
                      <>
                        <span>·</span>
                        <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                          {MODEL_SILHOUETTE_LABELS[look.model_silhouette]}
                          {look.model_silhouette === 'female' && look.female_style
                            ? ` · ${FEMALE_STYLE_LABELS[look.female_style]}`
                            : ''}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-2.5 flex h-3 overflow-hidden rounded-full border border-stone-200">
                    {look.recommendation.items.map((item, idx) => (
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

                  {look.belt?.hex && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-600">
                      <span
                        className="h-3 w-3 rounded-full border border-stone-300"
                        style={{ backgroundColor: look.belt.hex }}
                      />
                      <span>Belt: {look.belt.name}</span>
                    </div>
                  )}

                  <p className="mt-2 text-xs leading-relaxed text-stone-600">
                    {look.recommendation.styling_rationale}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
