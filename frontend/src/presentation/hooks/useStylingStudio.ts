import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LookStorageUseCases } from '../../application/useCases';
import {
  BELT_PALETTE,
  SKIN_TONES,
  type AIStatus,
  type BeltOption,
  type ColorMatchResult,
  type ColorToken,
  type FemaleBottomStyle,
  type GarmentSlot,
  type ModelSilhouette,
  type Occasion,
  type OutfitRecommendation,
  type SavedLook,
  type SkinTone,
} from '../../domain/models';
import { ApiClientError, FastApiHttpClient } from '../../infrastructure/api/FastApiHttpClient';
import { IndexedDBLookRepository } from '../../infrastructure/indexeddb/IndexedDBLookRepository';

export type SourceFilter = 'all' | 'math_engine' | 'ollama_ai';

const STORAGE_KEY_MODEL = 'atelier-pal:model-silhouette';
const STORAGE_KEY_FEMALE_STYLE = 'atelier-pal:female-style';

function readStoredModel(): ModelSilhouette {
  try {
    const val = window.localStorage.getItem(STORAGE_KEY_MODEL);
    if (val === 'female' || val === 'male') return val;
  } catch {
    // Ignore storage errors in restricted environments
  }
  return 'male';
}

function readStoredFemaleStyle(): FemaleBottomStyle {
  try {
    const val = window.localStorage.getItem(STORAGE_KEY_FEMALE_STYLE);
    if (val === 'skirt' || val === 'trousers') return val;
  } catch {
    // Ignore storage errors in restricted environments
  }
  return 'trousers';
}

export const BUILDABLE_SLOTS: GarmentSlot[] = [
  'top',
  'bottom',
  'outerwear',
  'footwear',
];

function findNextOpenSlot(
  locked: Partial<Record<GarmentSlot, ColorToken>>,
  current: GarmentSlot,
): GarmentSlot {
  const startIdx = BUILDABLE_SLOTS.indexOf(current);
  for (let offset = 1; offset <= BUILDABLE_SLOTS.length; offset++) {
    const candidate = BUILDABLE_SLOTS[(startIdx + offset) % BUILDABLE_SLOTS.length];
    if (!locked[candidate]) {
      return candidate;
    }
  }
  return current;
}

export function useStylingStudio() {
  const apiClient = useMemo(() => new FastApiHttpClient('/api/v1'), []);
  const lookStorage = useMemo(
    () => new LookStorageUseCases(new IndexedDBLookRepository()),
    [],
  );

  const [palette, setPalette] = useState<ColorToken[]>([]);
  const [activeSlot, setActiveSlot] = useState<GarmentSlot>('top');
  const [anchorSlot, setAnchorSlot] = useState<GarmentSlot>('top');
  const [lockedTokens, setLockedTokens] = useState<Partial<Record<GarmentSlot, ColorToken>>>(
    {},
  );
  const [customMatch, setCustomMatch] = useState<ColorMatchResult | null>(null);
  const [occasion, setOccasion] = useState<Occasion>('smart_casual');
  const [remixSeed, setRemixSeed] = useState<number>(0);

  const [computedRecs, setComputedRecs] = useState<OutfitRecommendation[]>([]);
  const [computedLoading, setComputedLoading] = useState<boolean>(false);
  const [computedError, setComputedError] = useState<string | null>(null);

  const [aiRecs, setAiRecs] = useState<OutfitRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<{ message: string; setupHint?: string } | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [activeRecommendationId, setActiveRecommendationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<ModelSilhouette>(readStoredModel);
  const [femaleStyle, setFemaleStyleState] = useState<FemaleBottomStyle>(readStoredFemaleStyle);
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTone>(SKIN_TONES[4]);
  const [selectedBelt, setSelectedBelt] = useState<BeltOption>(BELT_PALETTE[0]);

  const setSelectedModel = useCallback((model: ModelSilhouette) => {
    setSelectedModelState(model);
    try {
      window.localStorage.setItem(STORAGE_KEY_MODEL, model);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const setFemaleStyle = useCallback((style: FemaleBottomStyle) => {
    setFemaleStyleState(style);
    try {
      window.localStorage.setItem(STORAGE_KEY_FEMALE_STYLE, style);
    } catch {
      // Ignore storage errors
    }
  }, []);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState<boolean>(false);

  const aiRequestSeq = useRef(0);
  const preferredSourceRef = useRef<'math_engine' | 'ollama_ai'>('math_engine');

  const lockedSlots = useMemo<Partial<Record<GarmentSlot, string>>>(() => {
    const result: Partial<Record<GarmentSlot, string>> = {};
    for (const slot of BUILDABLE_SLOTS) {
      const token = lockedTokens[slot];
      if (token) {
        result[slot] = token.id;
      }
    }
    return result;
  }, [lockedTokens]);

  const { baseSlot, selectedToken } = useMemo(() => {
    const anchorToken = lockedTokens[anchorSlot];
    if (anchorToken) {
      return { baseSlot: anchorSlot, selectedToken: anchorToken };
    }
    for (const slot of BUILDABLE_SLOTS) {
      const token = lockedTokens[slot];
      if (token) {
        return { baseSlot: slot, selectedToken: token };
      }
    }
    return { baseSlot: activeSlot, selectedToken: null };
  }, [lockedTokens, anchorSlot, activeSlot]);

  const lockedCount = useMemo(
    () => BUILDABLE_SLOTS.filter((slot) => Boolean(lockedTokens[slot])).length,
    [lockedTokens],
  );

  const refreshAIStatus = useCallback(async () => {
    try {
      const status = await apiClient.getAIStatus();
      setAiStatus(status);
      return status;
    } catch {
      const fallback: AIStatus = {
        available: false,
        configured_model: 'llama3.2',
        active_model: null,
        installed_models: [],
        base_url: 'http://localhost:11434',
        message: 'Backend API unreachable.',
        setup_instructions: 'Start FastAPI backend and run: ollama pull llama3.2',
      };
      setAiStatus(fallback);
      return fallback;
    }
  }, [apiClient]);

  // Initial load: palette, AI status, saved looks
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [colors, status, looks] = await Promise.all([
          apiClient.getColors(),
          refreshAIStatus(),
          lookStorage.listSavedLooks(),
        ]);
        if (!active) return;
        setPalette(colors);
        setAiStatus(status);
        setSavedLooks(looks);
        const defaultToken =
          colors.find((c) => c.id === 'midnight-navy') ?? colors[0] ?? null;
        if (defaultToken) {
          setLockedTokens({ top: defaultToken });
          setAnchorSlot('top');
          setActiveSlot('bottom');
        }
      } catch (err) {
        if (!active) return;
        setComputedError(
          err instanceof Error ? err.message : 'Failed to connect to styling backend.',
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [apiClient, lookStorage, refreshAIStatus]);

  // Track A: Computed Recommendations (fast, deterministic)
  useEffect(() => {
    if (!selectedToken) {
      setComputedRecs([]);
      setComputedLoading(false);
      return;
    }
    let active = true;
    setComputedLoading(true);
    setComputedError(null);

    apiClient
      .getComputedRecommendations({
        base_token_id: selectedToken.id,
        base_slot: baseSlot,
        occasion,
        locked_slots: lockedSlots,
        remix_seed: remixSeed,
      })
      .then((res) => {
        if (!active) return;
        setComputedRecs(res.recommendations);
      })
      .catch((err) => {
        if (!active) return;
        setComputedError(err instanceof Error ? err.message : 'Failed to compute pairings.');
      })
      .finally(() => {
        if (active) setComputedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiClient, selectedToken, baseSlot, occasion, lockedSlots, remixSeed]);

  // Track B: AI Recommendations (async, graceful degradation)
  const fetchAIRecs = useCallback(
    async (
      token: ColorToken,
      slot: GarmentSlot,
      occ: Occasion,
      locks: Partial<Record<GarmentSlot, string>>,
    ) => {
      const seq = ++aiRequestSeq.current;
      setAiLoading(true);
      setAiError(null);

      try {
        const res = await apiClient.getAIRecommendations({
          base_token_id: token.id,
          base_slot: slot,
          occasion: occ,
          locked_slots: locks,
        });
        if (seq !== aiRequestSeq.current) return;
        setAiRecs(res.recommendations);
      } catch (err) {
        if (seq !== aiRequestSeq.current) return;
        setAiRecs([]);
        if (err instanceof ApiClientError) {
          setAiError({ message: err.message, setupHint: err.setupHint });
        } else {
          setAiError({
            message: err instanceof Error ? err.message : 'AI Stylist unavailable.',
          });
        }
      } finally {
        if (seq === aiRequestSeq.current) {
          setAiLoading(false);
        }
      }
    },
    [apiClient],
  );

  useEffect(() => {
    if (!selectedToken) {
      setAiRecs([]);
      setAiLoading(false);
      return;
    }
    if (aiStatus && !aiStatus.available) {
      setAiRecs([]);
      setAiError({
        message: aiStatus.message,
        setupHint: aiStatus.setup_instructions ?? undefined,
      });
      return;
    }
    void fetchAIRecs(selectedToken, baseSlot, occasion, lockedSlots);
  }, [selectedToken, baseSlot, occasion, lockedSlots, aiStatus, fetchAIRecs]);

  const assignTokenToSlot = useCallback(
    (slot: GarmentSlot, token: ColorToken) => {
      setLockedTokens((prev) => {
        const next = { ...prev, [slot]: token };
        setActiveSlot(findNextOpenSlot(next, slot));
        return next;
      });
      setAnchorSlot((prevAnchor) => (lockedTokens[prevAnchor] ? prevAnchor : slot));
      setRemixSeed(0);
    },
    [lockedTokens],
  );

  const selectToken = useCallback(
    (token: ColorToken) => {
      setCustomMatch(null);
      assignTokenToSlot(activeSlot, token);
    },
    [activeSlot, assignTokenToSlot],
  );

  const matchCustomHex = useCallback(
    async (hexColor: string) => {
      try {
        const match = await apiClient.matchColor(hexColor);
        setCustomMatch(match);
        assignTokenToSlot(activeSlot, match.matched_token);
      } catch (err) {
        setComputedError(
          err instanceof Error ? err.message : 'Could not match custom hex color.',
        );
      }
    },
    [activeSlot, apiClient, assignTokenToSlot],
  );

  const unlockSlot = useCallback((slot: GarmentSlot) => {
    setLockedTokens((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setActiveSlot(slot);
    setRemixSeed(0);
  }, []);

  const resetAllLocks = useCallback(() => {
    setLockedTokens({});
    setCustomMatch(null);
    setActiveSlot('top');
    setAnchorSlot('top');
    setRemixSeed(0);
  }, []);

  const toggleLockSlot = useCallback(
    (slot: GarmentSlot, tokenId: string) => {
      const currentLocked = lockedTokens[slot];
      if (currentLocked?.id === tokenId) {
        unlockSlot(slot);
        return;
      }
      const token = palette.find((c) => c.id === tokenId);
      if (!token) return;
      assignTokenToSlot(slot, token);
    },
    [assignTokenToSlot, lockedTokens, palette, unlockSlot],
  );

  const remixComputed = useCallback(() => {
    setRemixSeed((s) => s + 1);
  }, []);

  const regenerateAI = useCallback(() => {
    if (!selectedToken) return;
    void fetchAIRecs(selectedToken, baseSlot, occasion, lockedSlots);
  }, [selectedToken, baseSlot, occasion, lockedSlots, fetchAIRecs]);

  const visibleRecommendations = useMemo(() => {
    if (sourceFilter === 'math_engine') return computedRecs;
    if (sourceFilter === 'ollama_ai') return aiRecs;
    return preferredSourceRef.current === 'ollama_ai'
      ? [...aiRecs, ...computedRecs]
      : [...computedRecs, ...aiRecs];
  }, [sourceFilter, computedRecs, aiRecs]);

  const allRecommendations = useMemo(
    () => [...computedRecs, ...aiRecs],
    [computedRecs, aiRecs],
  );

  useEffect(() => {
    if (visibleRecommendations.length === 0) {
      if (allRecommendations.length === 0) {
        setActiveRecommendationId(null);
      }
      return;
    }
    if (
      !activeRecommendationId ||
      !visibleRecommendations.some((rec) => rec.id === activeRecommendationId)
    ) {
      setActiveRecommendationId(visibleRecommendations[0].id);
    }
  }, [visibleRecommendations, allRecommendations.length, activeRecommendationId]);

  const selectRecommendation = useCallback((rec: OutfitRecommendation) => {
    preferredSourceRef.current = rec.source;
    setActiveRecommendationId(rec.id);
  }, []);

  const activeRecommendation = useMemo(
    () =>
      allRecommendations.find((rec) => rec.id === activeRecommendationId) ??
      allRecommendations[0] ??
      null,
    [allRecommendations, activeRecommendationId],
  );

  const saveLook = useCallback(
    async (recommendation: OutfitRecommendation) => {
      if (!selectedToken) return;
      const look: SavedLook = {
        id: recommendation.id,
        saved_at: new Date().toISOString(),
        base_token: selectedToken,
        base_slot: baseSlot,
        occasion,
        recommendation,
        model_silhouette: selectedModel,
        ...(selectedModel === 'female' ? { female_style: femaleStyle } : {}),
        ...(selectedBelt.hex ? { belt: selectedBelt } : {}),
      };
      await lookStorage.saveLook(look);
      const updated = await lookStorage.listSavedLooks();
      setSavedLooks(updated);
    },
    [selectedToken, baseSlot, occasion, selectedModel, femaleStyle, selectedBelt, lookStorage],
  );

  const deleteSavedLook = useCallback(
    async (id: string) => {
      await lookStorage.removeLook(id);
      const updated = await lookStorage.listSavedLooks();
      setSavedLooks(updated);
    },
    [lookStorage],
  );

  const savedLookIds = useMemo(
    () => new Set(savedLooks.map((l) => l.id)),
    [savedLooks],
  );

  return {
    palette,
    activeSlot,
    setActiveSlot,
    lockedTokens,
    lockedCount,
    selectedToken,
    customMatch,
    baseSlot,
    occasion,
    setOccasion,
    lockedSlots,
    computedRecs,
    computedLoading,
    computedError,
    aiRecs,
    aiLoading,
    aiError,
    aiStatus,
    sourceFilter,
    setSourceFilter,
    activeRecommendationId,
    setActiveRecommendationId,
    selectRecommendation,
    activeRecommendation,
    selectedModel,
    setSelectedModel,
    femaleStyle,
    setFemaleStyle,
    selectedSkinTone,
    setSelectedSkinTone,
    selectedBelt,
    setSelectedBelt,
    savedLooks,
    savedLookIds,
    isDrawerOpen,
    setIsDrawerOpen,
    isOllamaModalOpen,
    setIsOllamaModalOpen,
    selectToken,
    matchCustomHex,
    unlockSlot,
    resetAllLocks,
    toggleLockSlot,
    remixComputed,
    regenerateAI,
    refreshAIStatus,
    saveLook,
    deleteSavedLook,
  };
}
