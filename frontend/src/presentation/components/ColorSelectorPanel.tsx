import { useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import {
  OCCASION_LABELS,
  SLOT_LABELS,
  type ColorMatchResult,
  type ColorToken,
  type GarmentSlot,
  type Occasion,
} from '../../domain/models';

interface ColorSelectorPanelProps {
  palette: ColorToken[];
  selectedToken: ColorToken | null;
  customMatch: ColorMatchResult | null;
  baseSlot: GarmentSlot;
  occasion: Occasion;
  onSelectToken: (token: ColorToken) => void;
  onMatchCustomHex: (hex: string) => void;
  onChangeSlot: (slot: GarmentSlot) => void;
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
  selectedToken,
  customMatch,
  baseSlot,
  occasion,
  onSelectToken,
  onMatchCustomHex,
  onChangeSlot,
  onChangeOccasion,
}: ColorSelectorPanelProps) {
  const [customHex, setCustomHex] = useState('#3B5B6D');

  const neutrals = palette.filter((c) => c.is_neutral);
  const accents = palette.filter((c) => !c.is_neutral);

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
          const isSelected = selectedToken?.id === token.id;
          return (
            <button
              key={token.id}
              type="button"
              onClick={() => onSelectToken(token)}
              title={`${token.name} (${token.hex})`}
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
    <aside className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-serif text-lg font-semibold text-stone-900">
          1. Base Piece & Color
        </h2>
        <p className="mt-0.5 text-xs text-stone-500">
          Pick a wardrobe color or snap any custom hex via CIELAB.
        </p>
      </div>

      {selectedToken && (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <div
            className="h-11 w-11 shrink-0 rounded-lg border border-stone-300 shadow-inner"
            style={{ backgroundColor: selectedToken.hex }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-stone-900">
                {selectedToken.name}
              </p>
              <span className="rounded bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-medium capitalize text-stone-700">
                {selectedToken.undertone}
              </span>
            </div>
            <p className="font-mono text-xs text-stone-500">
              {selectedToken.hex} · L* {selectedToken.lab.L.toFixed(0)}
            </p>
            {customMatch && (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                Snapped from {customMatch.input_hex} (ΔE₂₀₀₀ = {customMatch.delta_e.toFixed(1)})
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {renderSwatchGrid(neutrals, 'Core Neutrals')}
        {renderSwatchGrid(accents, 'Statement & Accent Colors')}
      </div>

      <div className="border-t border-stone-100 pt-4">
        <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <Pipette className="h-3.5 w-3.5" />
          Custom Hex / Color Picker
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

      <div className="space-y-3 border-t border-stone-100 pt-4">
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-500">
            Garment Slot
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {SELECTABLE_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onChangeSlot(slot)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  baseSlot === slot
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                {SLOT_LABELS[slot]}
              </button>
            ))}
          </div>
        </div>

        <div>
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
      </div>
    </aside>
  );
}
