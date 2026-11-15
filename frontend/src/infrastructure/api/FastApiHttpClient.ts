import type { GeneratePairingsParams, StylingApiPort } from '../../application/ports';
import type {
  AIStatus,
  ColorMatchResult,
  ColorToken,
  OutfitRecommendation,
} from '../../domain/models';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly setupHint?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class FastApiHttpClient implements StylingApiPort {
  constructor(private readonly baseUrl = '/api/v1') {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      ...init,
    });

    if (!response.ok) {
      let detailMessage = `Request failed with status ${response.status}`;
      let code: string | undefined;
      let setupHint: string | undefined;
      try {
        const body = await response.json();
        if (body?.detail && typeof body.detail === 'object') {
          detailMessage = body.detail.message ?? detailMessage;
          code = body.detail.code;
          setupHint = body.detail.setup_hint;
        } else if (typeof body?.detail === 'string') {
          detailMessage = body.detail;
        }
      } catch {
        // Ignore non-JSON error body
      }
      throw new ApiClientError(detailMessage, response.status, code, setupHint);
    }

    return (await response.json()) as T;
  }

  async getHealth(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/health');
  }

  async getAIStatus(): Promise<AIStatus> {
    return this.request<AIStatus>('/system/ai-status');
  }

  async getColors(): Promise<ColorToken[]> {
    const data = await this.request<{ colors: ColorToken[]; total: number }>('/colors');
    return data.colors;
  }

  async matchColor(hexColor: string): Promise<ColorMatchResult> {
    return this.request<ColorMatchResult>('/colors/match', {
      method: 'POST',
      body: JSON.stringify({ hex_color: hexColor }),
    });
  }

  async getComputedRecommendations(
    params: GeneratePairingsParams,
  ): Promise<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }> {
    return this.request<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }>(
      '/recommendations/computed',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    );
  }

  async getAIRecommendations(
    params: GeneratePairingsParams,
  ): Promise<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }> {
    return this.request<{ base_token: ColorToken; recommendations: OutfitRecommendation[] }>(
      '/recommendations/ai',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    );
  }
}
