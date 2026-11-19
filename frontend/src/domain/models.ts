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

export type ModelSilhouette = 'male' | 'female';
export type FemaleBottomStyle = 'trousers' | 'skirt';

export interface SkinTone {
  name: string;
  hex: string;
}

export interface BeltOption {
  name: string;
  hex: string | null;
}

export interface SavedLook {
  id: string;
  saved_at: string;
  base_token: ColorToken;
  base_slot: GarmentSlot;
  occasion: Occasion;
  recommendation: OutfitRecommendation;
  belt?: BeltOption;
  model_silhouette?: ModelSilhouette;
  female_style?: FemaleBottomStyle;
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

export const MODEL_SILHOUETTE_LABELS: Record<ModelSilhouette, string> = {
  male: 'Male',
  female: 'Female',
};

export const FEMALE_STYLE_LABELS: Record<FemaleBottomStyle, string> = {
  trousers: 'Trousers',
  skirt: 'Skirt',
};

export const SKIN_TONES: readonly SkinTone[] = [
  { name: 'Fair', hex: '#F5D6C3' },
  { name: 'Light Medium', hex: '#E0B495' },
  { name: 'Medium', hex: '#C18C68' },
  { name: 'Deep Brown', hex: '#835237' },
  { name: 'Black', hex: '#2B2A27' },
];

export const BELT_PALETTE: readonly BeltOption[] = [
  { name: 'None', hex: null },
  { name: 'Tan', hex: '#C29563' },
  { name: 'Cognac', hex: '#A46434' },
  { name: 'Tobacco', hex: '#7D4E2D' },
  { name: 'Dark Brown', hex: '#422B1D' },
  { name: 'Oxblood', hex: '#592329' },
  { name: 'Olive Web', hex: '#4E5440' },
  { name: 'Navy Web', hex: '#202B3D' },
  { name: 'Black', hex: '#1A1A1C' },
];

export function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function isLightSkinTone(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.22;
}

export function isComputedSource(source: RecommendationSource): boolean {
  return source === 'math_engine';
}
