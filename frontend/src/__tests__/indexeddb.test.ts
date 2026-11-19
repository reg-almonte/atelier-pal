import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LookStorageUseCases } from '../application/useCases';
import type { SavedLook } from '../domain/models';
import { IndexedDBLookRepository } from '../infrastructure/indexeddb/IndexedDBLookRepository';

describe('IndexedDBLookRepository', () => {
  it('saves, lists, and deletes looks while preserving source provenance', async () => {
    const repo = new IndexedDBLookRepository();
    const useCases = new LookStorageUseCases(repo);

    const computedLook: SavedLook = {
      id: 'look-computed-1',
      saved_at: '2026-11-15T10:00:00.000Z',
      base_slot: 'top',
      occasion: 'smart_casual',
      base_token: {
        id: 'midnight-navy',
        name: 'Midnight Navy',
        hex: '#1E293B',
        hsl: { h: 217, s: 33, l: 17 },
        lab: { L: 17, a: 2, b: -15 },
        is_neutral: true,
        undertone: 'cool',
        value: 'dark',
        season_tags: ['winter'],
      },
      recommendation: {
        id: 'look-computed-1',
        source: 'math_engine',
        source_label: 'Computed · CIELAB + 60-30-10 Rules',
        strategy: 'classic',
        items: [
          {
            slot: 'bottom',
            hex: '#F5EFE6',
            color_name: 'Warm Ivory',
            matched_token_id: 'warm-ivory',
            proportion_percentage: 60,
          },
        ],
        styling_rationale: 'Balanced neutral anchor.',
        fabric_texture_tip: 'Crisp cotton poplin.',
      },
    };

    const aiLook: SavedLook = {
      ...computedLook,
      id: 'look-ai-1',
      saved_at: '2026-11-15T11:00:00.000Z',
      belt: { name: 'Tobacco', hex: '#7D4E2D' },
      model_silhouette: 'female',
      female_style: 'skirt',
      recommendation: {
        ...computedLook.recommendation,
        id: 'look-ai-1',
        source: 'ollama_ai',
        source_label: 'AI Stylist · llama3.2',
        strategy: 'ai_curated',
      },
    };

    await useCases.saveLook(computedLook);
    await useCases.saveLook(aiLook);

    const listed = await useCases.listSavedLooks();
    expect(listed).toHaveLength(2);
    expect(listed[0].id).toBe('look-ai-1');
    expect(listed[0].recommendation.source).toBe('ollama_ai');
    expect(listed[0].belt).toEqual({ name: 'Tobacco', hex: '#7D4E2D' });
    expect(listed[0].model_silhouette).toBe('female');
    expect(listed[0].female_style).toBe('skirt');
    expect(listed[1].recommendation.source).toBe('math_engine');
    expect(listed[1].belt).toBeUndefined();
    expect(listed[1].model_silhouette).toBeUndefined();

    await useCases.removeLook('look-computed-1');
    const afterDelete = await useCases.listSavedLooks();
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe('look-ai-1');
  });
});
