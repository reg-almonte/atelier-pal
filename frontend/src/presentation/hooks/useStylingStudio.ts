import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LookStorageUseCases } from '../../application/useCases';
import {
  BELT_PALETTE,
  SKIN_TONES,
  type AIStatus,
  type BeltOption,
  type ColorMatchResult,
  type ColorToken,
  type GarmentSlot,
  type Occasion,
  type OutfitRecommendation,
  type SavedLook,
  type SkinTone,
} from '../../domain/models';
import { ApiClientError, FastApiHttpClient } from '../../infrastructure/api/FastApiHttpClient';
import { IndexedDBLookRepository } from '../../infrastructure/indexeddb/IndexedDBLookRepository';

export type SourceFilter = 'all' | 'math_engine' | 'ollama_ai';

export function useStylingStudio() {
  const apiClient = useMemo(() => new FastApiHttpClient('/api/v1'), []);
  const lookStorage = useMemo(
    () => new LookStorageUseCases(new IndexedDBLookRepository()),
    [],
  );

  const [palette, setPalette] = useState<ColorToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<ColorToken | null>(null);
  const [customMatch, setCustomMatch] = useState<ColorMatchResult | null>(null);
  const [baseSlot, setBaseSlot] = useState<GarmentSlot>('top');
  const [occasion, setOccasion] = useState<Occasion>('smart_casual');
  const [lockedSlots, setLockedSlots] = useState<Partial<Record<GarmentSlot, string>>>({});
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
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTone>(SKIN_TONES[4]);
  const [selectedBelt, setSelectedBelt] = useState<BeltOption>(BELT_PALETTE[0]);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isOllamaModalOpen, setIsOllamaModalOpen] = useState<boolean>(false);

  const aiRequestSeq = useRef(0);

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
        setSelectedToken(defaultToken);
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
    if (!selectedToken) return;
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
    async (token: ColorToken, slot: GarmentSlot, occ: Occasion) => {
      const seq = ++aiRequestSeq.current;
      setAiLoading(true);
      setAiError(null);

      try {
        const res = await apiClient.getAIRecommendations({
          base_token_id: token.id,
          base_slot: slot,
          occasion: occ,
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
    if (!selectedToken) return;
    if (aiStatus && !aiStatus.available) {
      setAiRecs([]);
      setAiError({
        message: aiStatus.message,
        setupHint: aiStatus.setup_instructions ?? undefined,
      });
      return;
    }
    void fetchAIRecs(selectedToken, baseSlot, occasion);
  }, [selectedToken, baseSlot, occasion, aiStatus, fetchAIRecs]);

  const selectToken = useCallback((token: ColorToken) => {
    setSelectedToken(token);
    setCustomMatch(null);
    setLockedSlots({});
    setRemixSeed(0);
  }, []);

  const matchCustomHex = useCallback(
    async (hexColor: string) => {
      try {
        const match = await apiClient.matchColor(hexColor);
        setCustomMatch(match);
        setSelectedToken(match.matched_token);
        setLockedSlots({});
        setRemixSeed(0);
      } catch (err) {
        setComputedError(
          err instanceof Error ? err.message : 'Could not match custom hex color.',
        );
      }
    },
    [apiClient],
  );

  const toggleLockSlot = useCallback((slot: GarmentSlot, tokenId: string) => {
    setLockedSlots((prev) => {
      const next = { ...prev };
      if (next[slot] === tokenId) {
        delete next[slot];
      } else {
        next[slot] = tokenId;
      }
      return next;
    });
  }, []);

  const remixComputed = useCallback(() => {
    setRemixSeed((s) => s + 1);
  }, []);

  const regenerateAI = useCallback(() => {
    if (!selectedToken) return;
    void fetchAIRecs(selectedToken, baseSlot, occasion);
  }, [selectedToken, baseSlot, occasion, fetchAIRecs]);

  const allRecommendations = useMemo(
    () => [...computedRecs, ...aiRecs],
    [computedRecs, aiRecs],
  );

  useEffect(() => {
    if (allRecommendations.length === 0) {
      setActiveRecommendationId(null);
      return;
    }
    if (
      !activeRecommendationId ||
      !allRecommendations.some((rec) => rec.id === activeRecommendationId)
    ) {
      setActiveRecommendationId(allRecommendations[0].id);
    }
  }, [allRecommendations, activeRecommendationId]);

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
        ...(selectedBelt.hex ? { belt: selectedBelt } : {}),
      };
      await lookStorage.saveLook(look);
      const updated = await lookStorage.listSavedLooks();
      setSavedLooks(updated);
    },
    [selectedToken, baseSlot, occasion, selectedBelt, lookStorage],
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
    selectedToken,
    customMatch,
    baseSlot,
    setBaseSlot,
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
    activeRecommendation,
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
    toggleLockSlot,
    remixComputed,
    regenerateAI,
    refreshAIStatus,
    saveLook,
    deleteSavedLook,
  };
}
