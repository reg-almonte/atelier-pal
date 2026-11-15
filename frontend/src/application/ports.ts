import type {
  AIStatus,
  ColorMatchResult,
  ColorToken,
  GarmentSlot,
  Occasion,
  OutfitRecommendation,
  SavedLook,
} from '../domain/models';

export interface GeneratePairingsParams {
  base_token_id?: string;
  base_color_hex?: string;
  base_slot: GarmentSlot;
  occasion: Occasion;
  locked_slots?: Partial<Record<GarmentSlot, string>>;
  remix_seed?: number;
}

export interface StylingApiPort {
  getHealth(): Promise<{ status: string; version: string }>;
  getAIStatus(): Promise<AIStatus>;
  getColors(): Promise<ColorToken[]>;
  matchColor(hexColor: string): Promise<ColorMatchResult>;
  getComputedRecommendations(
    params: GeneratePairingsParams,
  ): Promise<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }>;
  getAIRecommendations(
    params: GeneratePairingsParams,
  ): Promise<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }>;
}

export interface LookRepositoryPort {
  listLooks(): Promise<SavedLook[]>;
  saveLook(look: SavedLook): Promise<void>;
  deleteLook(id: string): Promise<void>;
}
