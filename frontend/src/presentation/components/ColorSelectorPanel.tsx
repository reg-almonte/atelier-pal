import { useState } from 'react';
import { Check, CheckCircle2, Lock, Pipette, RotateCcw, X } from 'lucide-react';
import {
  OCCASION_LABELS,
  SLOT_LABELS,
  type ColorMatchResult,
  type ColorToken,
  type GarmentSlot,
  type Occasion,
  type OutfitRecommendation,
} from '../../domain/models';

interface ColorSelectorPanelProps {
  palette: ColorToken[];
  activeSlot: GarmentSlot;
  lockedTokens: Partial<Record<GarmentSlot, ColorToken>>;
  lockedCount: number;
  activeRecommendation: OutfitRecommendation | null;
  customMatch: ColorMatchResult | null;
  occasion: Occasion;
  onSelectSlot: (slot: GarmentSlot) => void;
  onUnlockSlot: (slot: GarmentSlot) => void;
  onResetLocks: () => void;
  onSelectToken: (token: ColorToken) => void;
  onMatchCustomHex: (hex: string) => void;
  onChangeOccasion: (occasion: Occasion) => void;
}

const SELECTABLE_SLOTS: GarmentSlot[] = ['top', 'bottom', 'outerwear', 'footwear'];
const SELECTABLE_OCCASIONS: Occasion[] = [
  'casual',
  'smart_casual',
  'office',
  'date_night',
];

export function ColorSelectorPanel({
  palette,
  activeSlot,
  lockedTokens,
  lockedCount,
  activeRecommendation,
  customMatch,
  occasion,
  onSelectSlot,
  onUnlockSlot,
  onResetLocks,
  onSelectToken,
  onMatchCustomHex,
  onChangeOccasion,
}: ColorSelectorPanelProps) {
  const [customHex, setCustomHex] = useState('#3B5B6D');

  const neutrals = palette.filter((c) => c.is_neutral);
  const accents = palette.filter((c) => !c.is_neutral);
  const activeLockedToken = lockedTokens[activeSlot] ?? null;

  const suggestedBySlot = Object.fromEntries(
    (activeRecommendation?.items ?? []).map((item) => [item.slot, item]),
  );

  const renderSwatchGrid = (tokens: ColorToken[], label: string) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </h3>
        <span className="text-[11px] text-stone-400">{tokens.length}</span>
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-6">
        {tokens.map((token) => {
          const isSelected = activeLockedToken?.id === token.id;
          return (
            <button
              key={token.id}
              type="button"
              onClick={() => onSelectToken(token)}
              title={`Set ${SLOT_LABELS[activeSlot]} to ${token.name} (${token.hex})`}
              className={`group relative flex h-10 w-full items-center justify-center rounded-xl border transition ${
                isSelected
                  ? 'scale-105 border-stone-900 ring-2 ring-stone-900 ring-offset-2'
                  : 'border-stone-200 hover:scale-105 hover:border-stone-400'
              }`}
              style={{ backgroundColor: token.hex }}
            >
              {isSelected && (
                <Check
                  className={`h-4 w-4 ${
                    token.value === 'light' ? 'text-stone-900' : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      {/* Header & Progress */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-semibold text-stone-900">
            1. Outfit Builder
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Lock colors piece by piece ({lockedCount}/4 locked).
          </p>
        </div>

        {lockedCount > 0 && (
          <button
            type="button"
            onClick={onResetLocks}
            title="Clear all locked garments"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* 4-Slot Progressive Lock List (1 col x 4 rows) */}
      <div className="flex flex-col gap-2" role="group" aria-label="Garment slots">
        {SELECTABLE_SLOTS.map((slot) => {
          const lockedToken = lockedTokens[slot];
          const suggested = suggestedBySlot[slot];
          const isActive = activeSlot === slot;
          const displayHex = lockedToken?.hex ?? suggested?.hex ?? null;
          const displayName = lockedToken?.name ?? suggested?.color_name ?? 'Pick color';

          return (
            <div
              key={slot}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onClick={() => onSelectSlot(slot)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSlot(slot);
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/90'
                  : lockedToken
                    ? 'border-stone-300 bg-white hover:border-stone-400'
                    : 'border-dashed border-stone-300 bg-stone-50/50 hover:border-stone-400'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-6 w-6 shrink-0 rounded-md border ${
                    lockedToken
                      ? 'border-stone-300 shadow-sm'
                      : 'border-dashed border-stone-300 opacity-75'
                  }`}
                  style={{ backgroundColor: displayHex ?? 'transparent' }}
                />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    {SLOT_LABELS[slot]}
                  </span>
                  <span
                    className={`block truncate text-xs font-medium ${
                      lockedToken ? 'text-stone-900' : 'text-stone-500'
                    }`}
                  >
                    {displayName}
                  </span>
                </div>
              </div>

              {lockedToken ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockSlot(slot);
                  }}
                  title={`Unlock ${SLOT_LABELS[slot]}`}
                  aria-label={`Unlock ${SLOT_LABELS[slot]}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white transition hover:bg-stone-700"
                >
                  <Lock className="h-2.5 w-2.5" />
                  <X className="h-2.5 w-2.5" />
                </button>
              ) : (
                <span className="shrink-0 rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {isActive ? 'Picking' : suggested ? 'Suggested' : 'Open'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {lockedCount === SELECTABLE_SLOTS.length && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          <span>
            All 4 garments locked! Save this look or click any slot above to swap a color.
          </span>
        </div>
      )}

      {/* Active Slot Color Picker */}
      <div className="space-y-4 border-t border-stone-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-800">
            Pick color for{' '}
            <span className="rounded bg-stone-900 px-1.5 py-0.5 text-white">
              {SLOT_LABELS[activeSlot]}
            </span>
          </span>
          {activeLockedToken && (
            <span className="font-mono text-[11px] text-stone-500">
              {activeLockedToken.name}
            </span>
          )}
        </div>

        {customMatch && (
          <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
            Snapped {customMatch.input_hex} → {customMatch.matched_token.name} (ΔE₂₀₀₀ ={' '}
            {customMatch.delta_e.toFixed(1)})
          </p>
        )}

        {renderSwatchGrid(neutrals, 'Core Neutrals')}
        {renderSwatchGrid(accents, 'Statement & Accent Colors')}
      </div>

      {/* Custom Hex */}
      <div className="border-t border-stone-100 pt-4">
        <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <Pipette className="h-3.5 w-3.5" />
          Custom Hex for {SLOT_LABELS[activeSlot]}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            aria-label="Custom color picker"
            className="h-9 w-11 cursor-pointer rounded-lg border border-stone-200 bg-white p-0.5"
          />
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="#3B5B6D"
            className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 font-mono text-xs text-stone-800 focus:border-stone-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onMatchCustomHex(customHex)}
            className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
          >
            Snap
          </button>
        </div>
      </div>

      {/* Occasion */}
      <div className="border-t border-stone-100 pt-4">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
          Occasion / Vibe
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {SELECTABLE_OCCASIONS.map((occ) => (
            <button
              key={occ}
              type="button"
              onClick={() => onChangeOccasion(occ)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                occasion === occ
                  ? 'border-stone-900 bg-stone-900 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              {OCCASION_LABELS[occ]}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
