# API Specifications — `/api/v1`

All endpoints are served under `/api/v1` by the FastAPI backend (`http://localhost:8000`). Interactive OpenAPI docs are available at `/docs`.

## 1. System & Health Endpoints

### `GET /api/v1/health`
Returns service health and version tag.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "version": "0.0.1",
  "service": "personal-styling-companion"
}
```

### `GET /api/v1/system/ai-status`
Pings Ollama `GET /api/tags`, checks if `OLLAMA_MODEL` is installed, auto-selects an installed model if available, or returns actionable setup instructions.

**Response `200 OK` (Connected):**
```json
{
  "available": true,
  "configured_model": "llama3.2",
  "active_model": "llama3.2:latest",
  "installed_models": ["llama3.2:latest"],
  "base_url": "http://localhost:11434",
  "message": "Connected to Ollama using llama3.2:latest.",
  "setup_instructions": null
}
```

**Response `200 OK` (Offline / No Models):**
```json
{
  "available": false,
  "configured_model": "llama3.2",
  "active_model": null,
  "installed_models": [],
  "base_url": "http://localhost:11434",
  "message": "Ollama is offline or unreachable (ConnectError).",
  "setup_instructions": "Start Ollama locally (ollama serve) and run: ollama pull llama3.2"
}
```

---

## 2. Color Palette & CIELAB Matching

### `GET /api/v1/colors`
Returns the curated 30-color wardrobe palette (12 Core Neutrals + 18 Statement/Accent Colors) with precomputed HSL and CIELAB D65 coordinates.

**Response `200 OK`:**
```json
{
  "total": 30,
  "colors": [
    {
      "id": "midnight-navy",
      "name": "Midnight Navy",
      "hex": "#1E293B",
      "hsl": { "h": 217.24, "s": 32.58, "l": 17.45 },
      "lab": { "L": 17.0185, "a": 1.8832, "b": -15.4321 },
      "is_neutral": true,
      "undertone": "cool",
      "value": "dark",
      "season_tags": ["winter", "summer", "all_season"]
    }
  ]
}
```

### `POST /api/v1/colors/match`
Snaps an arbitrary hex color to the perceptually closest `ColorToken` using CIEDE2000 ($\Delta E_{2000}$).

**Request:**
```json
{ "hex_color": "#2A3B4C" }
```

**Response `200 OK`:**
```json
{
  "input_hex": "#2A3B4C",
  "matched_token": { "id": "midnight-navy", "name": "Midnight Navy", "hex": "#1E293B", "..." : "..." },
  "delta_e": 8.4211
}
```

**Error `422 Unprocessable Content`:**
```json
{ "detail": { "code": "INVALID_COLOR", "message": "Invalid hex color: 'xyz'" } }
```

---

## 3. Dual-Track Outfit Recommendations

### Common Request Body (`RecommendationRequest`)
```json
{
  "base_token_id": "midnight-navy",
  "base_color_hex": null,
  "base_slot": "top",
  "occasion": "smart_casual",
  "locked_slots": { "footwear": "cognac" },
  "remix_seed": 0
}
```
- `base_slot`: `"top" | "bottom" | "outerwear" | "footwear" | "accessory" | "full_body"`
- `occasion`: `"casual" | "smart_casual" | "office" | "date_night"`

### `POST /api/v1/recommendations/computed`
Track A — Deterministic CIELAB + 60-30-10 & Sanzo Wada-inspired rule engine returning 4 strategies (`classic`, `tonal`, `contrast`, `editorial`).

**Response `200 OK`:**
```json
{
  "base_token": { "id": "midnight-navy", "name": "Midnight Navy", "..." : "..." },
  "recommendations": [
    {
      "id": "uuid",
      "source": "math_engine",
      "source_label": "Computed · CIELAB + 60-30-10 Rules",
      "strategy": "classic",
      "items": [
        { "slot": "bottom", "hex": "#F5EFE6", "color_name": "Warm Ivory", "matched_token_id": "warm-ivory", "proportion_percentage": 60 },
        { "slot": "top", "hex": "#1E293B", "color_name": "Midnight Navy", "matched_token_id": "midnight-navy", "proportion_percentage": 30 },
        { "slot": "footwear", "hex": "#8C4A27", "color_name": "Cognac Leather", "matched_token_id": "cognac", "proportion_percentage": 10 }
      ],
      "styling_rationale": "[Smart Casual] Anchors Midnight Navy with Warm Ivory...",
      "fabric_texture_tip": "Balance crisp poplin or fine-gauge merino with structured twill or suede."
    }
  ]
}
```

### `POST /api/v1/recommendations/ai`
Track B — Independent Ollama AI stylist returning 2–3 structured outfits mapped to nearest `ColorToken` IDs.

**Response `200 OK`:** Same `RecommendationsResponse` shape with `source: "ollama_ai"`, `source_label: "AI Stylist · <model>"`, `strategy: "ai_curated"`.

**Error `503 Service Unavailable`:**
```json
{
  "detail": {
    "code": "OLLAMA_UNAVAILABLE",
    "message": "Ollama is offline or unreachable (ConnectError).",
    "setup_hint": "Start Ollama locally (ollama serve) and run: ollama pull llama3.2"
  }
}
```

### `POST /api/v1/recommendations/dual-track`
Combined endpoint returning `base_token`, `computed`, `ai_generated` (empty list if offline), and `ai_status`.

---

## 4. Reserved `v0.0.2+` Endpoint Contracts

- `GET /api/v1/wardrobe/items` / `POST /api/v1/wardrobe/items` — Digital Closet CRUD for `WardrobeItem` entities with photo blob references.
- `POST /api/v1/vision/extract-garment` — Multipart image upload returning extracted `GarmentSlot`, dominant CIELAB-matched `ColorToken`, and segmented garment preview.
