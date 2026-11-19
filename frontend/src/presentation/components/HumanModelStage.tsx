import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Calculator, Lock, Sparkles } from 'lucide-react';
import {
  BELT_PALETTE,
  FEMALE_STYLE_LABELS,
  isComputedSource,
  isLightSkinTone,
  MODEL_SILHOUETTE_LABELS,
  SKIN_TONES,
  STRATEGY_LABELS,
  type BeltOption,
  type ColorToken,
  type FemaleBottomStyle,
  type GarmentSlot,
  type ModelSilhouette,
  type OutfitRecommendation,
  type SkinTone,
} from '../../domain/models';
import { FemaleModelSvg } from './figures/FemaleModelSvg';
import { MaleModelSvg } from './figures/MaleModelSvg';

const OUTERWEAR_PRESET_IDS = [
  'midnight-navy',
  'charcoal-slate',
  'camel-tan',
  'olive-drab',
  'espresso-brown',
  'sand-beige',
  'forest-pine',
  'burgundy-wine',
];

const MODEL_OPTIONS: readonly ModelSilhouette[] = ['male', 'female'];
const FEMALE_STYLE_OPTIONS: readonly FemaleBottomStyle[] = ['trousers', 'skirt'];

interface HumanModelStageProps {
  recommendation: OutfitRecommendation | null;
  palette?: ColorToken[];
  selectedModel: ModelSilhouette;
  femaleStyle: FemaleBottomStyle;
  selectedSkinTone: SkinTone;
  selectedBelt: BeltOption;
  isSaved: boolean;
  activeSlot?: GarmentSlot;
  lockedSlots?: Partial<Record<GarmentSlot, string>>;
  onSelectModel: (model: ModelSilhouette) => void;
  onSelectFemaleStyle: (style: FemaleBottomStyle) => void;
  onSelectSlot?: (slot: GarmentSlot) => void;
  onSelectOuterwear?: (token: ColorToken | null) => void;
  onSelectSkinTone: (tone: SkinTone) => void;
  onSelectBelt: (belt: BeltOption) => void;
  onSave: (rec: OutfitRecommendation) => void;
}

export function HumanModelStage({
  recommendation,
  palette = [],
  selectedModel,
  femaleStyle,
  selectedSkinTone,
  selectedBelt,
  isSaved,
  activeSlot,
  lockedSlots = {},
  onSelectModel,
  onSelectFemaleStyle,
  onSelectSlot,
  onSelectOuterwear,
  onSelectSkinTone,
  onSelectBelt,
  onSave,
}: HumanModelStageProps) {
  const [hideOuterwear, setHideOuterwear] = useState(false);

  useEffect(() => {
    setHideOuterwear(false);
  }, [recommendation?.id]);

  const bySlot = Object.fromEntries(
    (recommendation?.items ?? []).map((item) => [item.slot, item]),
  );

  const topItem = bySlot.top;
  const outerwearItem = hideOuterwear ? undefined : bySlot.outerwear;
  const bottomItem = bySlot.bottom;
  const footwearItem = bySlot.footwear;

  const hasOuterwear = Boolean(outerwearItem);
  const outerwearSwatches = OUTERWEAR_PRESET_IDS.map((id) =>
    palette.find((c) => c.id === id),
  ).filter((c): c is ColorToken => Boolean(c));
  const fallbackSwatches =
    outerwearSwatches.length > 0 ? outerwearSwatches : palette.slice(0, 8);
  const hasBelt = selectedBelt.hex !== null;
  const lightSkin = isLightSkinTone(selectedSkinTone.hex);
  const computed = recommendation ? isComputedSource(recommendation.source) : true;
  const isFemale = selectedModel === 'female';

  const figureProps = {
    topHex: topItem?.hex ?? '#F9F9F7',
    bottomHex: bottomItem?.hex ?? '#263850',
    outerwearHex: outerwearItem?.hex ?? '#5B4636',
    hasOuterwear,
    footwearHex: footwearItem?.hex ?? '#F4F3EF',
    beltHex: selectedBelt.hex ?? '#7D4E2D',
    hasBelt,
    skinToneHex: selectedSkinTone.hex,
    lightSkin,
  };

  return (
    <section
      id="hero-stage"
      aria-label="Live Human Model Preview"
      className="flex flex-col overflow-hidden rounded-[18px] border border-[#E2DDD2] bg-white shadow-[0_6px_24px_rgba(28,27,24,0.04)] min-[1141px]:sticky min-[1141px]:top-[72px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 border-b border-[#E2DDD2] px-[18px] py-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          {recommendation ? (
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                computed ? 'bg-[#E0F2FE] text-[#0C4A6E]' : 'bg-[#EDE9FE] text-[#4C1D95]'
              }`}
            >
              {computed ? <Calculator className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {computed ? 'Computed · Color Math' : recommendation.source_label}
            </span>
          ) : (
            <span className="inline-flex w-fit items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">
              Studio Preview
            </span>
          )}
          <h2 className="truncate font-serif text-base font-bold text-[#1C1B18]">
            {recommendation ? STRATEGY_LABELS[recommendation.strategy] : 'Select a Look'}
          </h2>
        </div>

        <button
          type="button"
          disabled={!recommendation}
          onClick={() => recommendation && onSave(recommendation)}
          aria-label={isSaved ? 'Saved look' : 'Save look'}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
            isSaved
              ? 'border-[#1C1B18] bg-[#1C1B18] text-white'
              : 'border-[#1C1B18] bg-[#1C1B18] text-white hover:bg-[#33312B]'
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
              Save Look
            </>
          )}
        </button>
      </div>

      {/* Warm Radial Preview Pane */}
      <div
        className="flex flex-col items-center gap-2.5 px-[18px] pb-4 pt-3.5"
        style={{
          background: 'radial-gradient(circle at 50% 42%, #ECE8DF 0%, #DED8CB 100%)',
        }}
      >
        {/* Model Silhouette & Skin Tone Toolbar */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-full border border-[#E2DDD2] bg-white/80 px-2.5 py-1.5 backdrop-blur-sm">
          <div
            className="inline-flex items-center rounded-full border border-[#E2DDD2] bg-[#F6F4EF] p-0.5"
            role="group"
            aria-label="Model silhouette"
          >
            {MODEL_OPTIONS.map((model) => {
              const pressed = selectedModel === model;
              return (
                <button
                  key={model}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onSelectModel(model)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    pressed
                      ? 'bg-[#1C1B18] text-white shadow-sm'
                      : 'text-[#6E6A61] hover:text-[#1C1B18]'
                  }`}
                >
                  {MODEL_SILHOUETTE_LABELS[model]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Model skin tone">
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#6E6A61]">
              Tone
            </span>
            {SKIN_TONES.map((tone) => {
              const pressed = selectedSkinTone.name === tone.name;
              return (
                <button
                  key={tone.name}
                  type="button"
                  title={tone.name}
                  aria-label={`Model skin tone ${tone.name}`}
                  aria-pressed={pressed}
                  onClick={() => onSelectSkinTone(tone)}
                  style={{ backgroundColor: tone.hex }}
                  className={`h-[17px] w-[17px] rounded-full border border-[#1C1B18]/25 transition ${
                    pressed ? 'scale-110 ring-2 ring-[#1C1B18] ring-offset-2' : 'hover:scale-105'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Female Bottom Style Toolbar (preserves height for zero layout shift) */}
        <div
          aria-hidden={!isFemale}
          className={`flex w-full items-center justify-between gap-2 rounded-full border border-[#E2DDD2] bg-white/75 px-3 py-1 backdrop-blur-sm transition-opacity ${
            isFemale ? 'opacity-100' : 'pointer-events-none invisible opacity-0'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#6E6A61]">
            Style
          </span>
          <div
            className="inline-flex items-center rounded-full border border-[#E2DDD2] bg-[#F6F4EF] p-0.5"
            role="group"
            aria-label="Female silhouette style"
          >
            {FEMALE_STYLE_OPTIONS.map((style) => {
              const pressed = femaleStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  tabIndex={isFemale ? 0 : -1}
                  aria-pressed={pressed}
                  onClick={() => onSelectFemaleStyle(style)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    pressed
                      ? 'bg-[#1C1B18] text-white shadow-sm'
                      : 'text-[#6E6A61] hover:text-[#1C1B18]'
                  }`}
                >
                  {FEMALE_STYLE_LABELS[style]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Layered Human Model SVG */}
        <div className="flex w-full max-w-[245px] items-center justify-center">
          {isFemale ? (
            <FemaleModelSvg femaleStyle={femaleStyle} {...figureProps} />
          ) : (
            <MaleModelSvg {...figureProps} />
          )}
        </div>

        {/* 5-Slot Summary Strip */}
        <div
          className="grid w-full grid-cols-2 gap-1.5 rounded-xl border border-[#E2DDD2] bg-white/85 px-2.5 py-2 backdrop-blur-sm"
          aria-label="Selected outfit summary"
        >
          <SummarySlot
            label="Top"
            value={topItem?.color_name ?? '—'}
            hex={topItem?.hex ?? null}
            isLocked={Boolean(lockedSlots.top)}
            isActive={activeSlot === 'top'}
            onClick={onSelectSlot ? () => onSelectSlot('top') : undefined}
          />
          <SummarySlot
            label="Outerwear"
            value={outerwearItem ? outerwearItem.color_name : 'None'}
            hex={outerwearItem?.hex ?? null}
            dimmed={!hasOuterwear}
            isLocked={Boolean(lockedSlots.outerwear)}
            isActive={activeSlot === 'outerwear'}
            onClick={onSelectSlot ? () => onSelectSlot('outerwear') : undefined}
          />
          <SummarySlot
            label={isFemale && femaleStyle === 'skirt' ? 'Skirt' : 'Bottom'}
            value={bottomItem?.color_name ?? '—'}
            hex={bottomItem?.hex ?? null}
            isLocked={Boolean(lockedSlots.bottom)}
            isActive={activeSlot === 'bottom'}
            onClick={onSelectSlot ? () => onSelectSlot('bottom') : undefined}
          />
          <SummarySlot
            label="Footwear"
            value={footwearItem?.color_name ?? '—'}
            hex={footwearItem?.hex ?? null}
            isLocked={Boolean(lockedSlots.footwear)}
            isActive={activeSlot === 'footwear'}
            onClick={onSelectSlot ? () => onSelectSlot('footwear') : undefined}
          />
          <div className="col-span-2 border-t border-[#E2DDD2]/70 pt-1">
            <SummarySlot
              label="Belt"
              value={hasBelt ? selectedBelt.name : 'None'}
              hex={selectedBelt.hex}
              dimmed={!hasBelt}
            />
          </div>
        </div>
      </div>

      {/* Optional Outerwear Quick-Picker Strip */}
      {onSelectOuterwear && (
        <div className="flex flex-col gap-2 border-t border-[#E2DDD2] bg-white px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-[#1C1B18]">
              Outerwear
              <span className="rounded-full border border-[#E2DDD2] bg-[#F6F4EF] px-2 py-0.5 text-[10px] font-medium text-[#6E6A61]">
                Optional
              </span>
            </span>
            <span className="font-medium text-[#6E6A61]">
              {outerwearItem ? outerwearItem.color_name : 'None'}
            </span>
          </div>

          <div className="flex flex-wrap gap-[7px]" role="group" aria-label="Outerwear colors">
            <button
              type="button"
              title="No outerwear"
              aria-label="Outerwear None"
              aria-pressed={!hasOuterwear}
              onClick={() => {
                setHideOuterwear(true);
                onSelectOuterwear(null);
              }}
              style={{
                background:
                  'linear-gradient(to top right, transparent calc(50% - 1px), rgba(28, 27, 24, 0.45) calc(50% - 1px), rgba(28, 27, 24, 0.45) calc(50% + 1px), transparent calc(50% + 1px)), #FFFFFF',
              }}
              className={`h-[26px] w-[26px] rounded-full border border-[#1C1B18]/20 transition ${
                !hasOuterwear ? 'scale-105 ring-2 ring-[#1C1B18] ring-offset-2' : 'hover:scale-105'
              }`}
            />
            {fallbackSwatches.map((token) => {
              const pressed =
                hasOuterwear &&
                (lockedSlots.outerwear === token.id ||
                  outerwearItem?.matched_token_id === token.id);
              return (
                <button
                  key={token.id}
                  type="button"
                  title={token.name}
                  aria-label={`Outerwear ${token.name}`}
                  aria-pressed={pressed}
                  onClick={() => {
                    setHideOuterwear(false);
                    onSelectOuterwear(token);
                  }}
                  style={{ backgroundColor: token.hex }}
                  className={`h-[26px] w-[26px] rounded-full border border-[#1C1B18]/20 transition ${
                    pressed ? 'scale-105 ring-2 ring-[#1C1B18] ring-offset-2' : 'hover:scale-105'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Belt Quick-Picker Strip */}
      <div className="flex flex-col gap-2 border-t border-[#E2DDD2] bg-white px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-[#1C1B18]">
            Belt
            <span className="rounded-full border border-[#E2DDD2] bg-[#F6F4EF] px-2 py-0.5 text-[10px] font-medium text-[#6E6A61]">
              Optional
            </span>
          </span>
          <span className="font-medium text-[#6E6A61]">{selectedBelt.name}</span>
        </div>

        <div className="flex flex-wrap gap-[7px]" role="group" aria-label="Belt colors">
          {BELT_PALETTE.map((belt) => {
            const pressed = selectedBelt.name === belt.name;
            const isNone = belt.hex === null;
            return (
              <button
                key={belt.name}
                type="button"
                title={belt.name}
                aria-label={`Belt ${belt.name}`}
                aria-pressed={pressed}
                onClick={() => onSelectBelt(belt)}
                style={
                  isNone
                    ? {
                        background:
                          'linear-gradient(to top right, transparent calc(50% - 1px), rgba(28, 27, 24, 0.45) calc(50% - 1px), rgba(28, 27, 24, 0.45) calc(50% + 1px), transparent calc(50% + 1px)), #FFFFFF',
                      }
                    : { backgroundColor: belt.hex ?? undefined }
                }
                className={`h-[26px] w-[26px] rounded-full border border-[#1C1B18]/20 transition ${
                  pressed ? 'scale-105 ring-2 ring-[#1C1B18] ring-offset-2' : 'hover:scale-105'
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface SummarySlotProps {
  label: string;
  value: string;
  hex: string | null;
  dimmed?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

function SummarySlot({
  label,
  value,
  hex,
  dimmed = false,
  isLocked = false,
  isActive = false,
  onClick,
}: SummarySlotProps) {
  const content = (
    <>
      <span
        className="h-[11px] w-[11px] shrink-0 rounded-full border border-[#1C1B18]/25"
        style={{ backgroundColor: hex ?? 'transparent' }}
      />
      <div className="flex min-w-0 flex-col text-left">
        <span className="flex items-center gap-0.5 text-[10px] uppercase tracking-[0.05em] leading-[1.15] text-[#6E6A61]">
          {label}
          {isLocked && <Lock className="h-2.5 w-2.5 text-[#1C1B18]" />}
        </span>
        <span className="truncate text-[11px] font-semibold text-[#1C1B18]">{value}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`Pick color for ${label}`}
        className={`flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 transition ${
          isActive ? 'bg-[#1C1B18]/10 ring-1 ring-[#1C1B18]/40' : 'hover:bg-[#1C1B18]/5'
        } ${dimmed ? 'opacity-50' : ''}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 px-1.5 py-1 transition-opacity ${
        dimmed ? 'opacity-45' : ''
      }`}
    >
      {content}
    </div>
  );
}
