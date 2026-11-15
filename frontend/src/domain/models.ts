export type Undertone = 'warm' | 'cool' | 'neutral';
export type ColorValue = 'light' | 'medium' | 'dark';

export type GarmentSlot =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'footwear'
  | 'accessory'
  | 'full_body';

export type Occasion = 'casual' | 'smart_casual' | 'office' | 'date_night';

export type RecommendationSource = 'math_engine' | 'ollama_ai';

export type RecommendationStrategy =
  | 'classic'
  | 'tonal'
  | 'contrast'
  | 'editorial'
  | 'ai_curated';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface ColorToken {
  id: string;
  name: string;
  hex: string;
  hsl: HSL;
  lab: LabColor;
  is_neutral: boolean;
  undertone: Undertone;
  value: ColorValue;
  season_tags: string[];
}

export interface ColorMatchResult {
  input_hex: string;
  matched_token: ColorToken;
  delta_e: number;
}

export interface OutfitItem {
  slot: GarmentSlot;
  hex: string;
  color_name: string;
  matched_token_id: string;
  proportion_percentage: number;
}

export interface OutfitRecommendation {
  id: string;
  source: RecommendationSource;
  source_label: string;
  strategy: RecommendationStrategy;
  items: OutfitItem[];
  styling_rationale: string;
  fabric_texture_tip?: string | null;
}

export interface AIStatus {
  available: boolean;
  configured_model: string;
  active_model: string | null;
  installed_models: string[];
  base_url: string;
  message: string;
  setup_instructions?: string | null;
}

export interface SavedLook {
  id: string;
  saved_at: string;
  base_token: ColorToken;
  base_slot: GarmentSlot;
  occasion: Occasion;
  recommendation: OutfitRecommendation;
}

export interface WardrobeItem {
  id: string;
  slot: GarmentSlot;
  primary_color_id: string;
  secondary_color_ids: string[];
  name: string;
  is_virtual: boolean;
  image_ref?: string;
}

export const SLOT_LABELS: Record<GarmentSlot, string> = {
  top: 'Top',
  bottom: 'Bottom',
  outerwear: 'Outerwear',
  footwear: 'Footwear',
  accessory: 'Accessory',
  full_body: 'Full Body',
};

export const OCCASION_LABELS: Record<Occasion, string> = {
  casual: 'Casual',
  smart_casual: 'Smart Casual',
  office: 'Office',
  date_night: 'Date Night',
};

export const STRATEGY_LABELS: Record<RecommendationStrategy, string> = {
  classic: 'Safe & Everyday',
  tonal: 'Monochromatic / Tonal',
  contrast: 'Balanced Contrast',
  editorial: 'Editorial / Seasonal',
  ai_curated: 'AI Stylist Curated',
};

export function isComputedSource(source: RecommendationSource): boolean {
  return source === 'math_engine';
}
