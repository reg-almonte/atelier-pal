# Project: Personal Styling Companion — v0.0.1 MVP (Strict Hexagonal Architecture + Dual-Track Color Pairing)

## 1. Product Vision, Versioning & Architectural Mandate
Build **v0.0.1** of a local-first **Personal Styling Companion** designed to evolve into a full wardrobe management, garment photo extraction, weather/occasion planning, and AI styling platform across Web and future Mobile clients.

- **Version:** `0.0.1` (tag in `package.json`, `pyproject.toml`, `/api/v1/health`, and UI footer).
- **Mobile-Ready Client/Server Split:** All core recommendation logic, color math, and Ollama AI orchestration MUST live in the **Python FastAPI backend** behind versioned REST endpoints (`/api/v1/...`), so future iOS/Android apps can consume the exact same backend API without duplicating business logic.
- **Strict Hexagonal Architecture (Ports & Adapters):** Enforce strict inward dependency rules on both backend and frontend:
  - `domain/` — Pure entities, value objects, domain exceptions, and deterministic color-math/styling rules. **Zero framework, HTTP, database, or LLM SDK imports allowed.**
  - `application/` — Use-cases (`GenerateOutfitRecommendations`, `SaveLook`, `CheckAIHealth`), input/output DTOs, and abstract **Ports** (interfaces) for `ColorPairingPort`, `AIStylistPort`, `WardrobeRepositoryPort`, and `TelemetryPort`.
  - `infrastructure/` (Adapters) — Concrete implementations of Ports (e.g., `OllamaStylistAdapter`, `CielabRuleEngineAdapter`, `IndexedDBLookRepository`, `FastApiHttpClient`), plus explicit **DTO ↔ Domain Mappers**.
  - `presentation/` (Driving Adapters) — FastAPI routers/schemas on the backend; React components, hooks, and view-models on the frontend.
  - Include automated architecture boundary tests (`pytest` on backend, `vitest` on frontend) verifying that `domain/` never imports from `application/`, `infrastructure/`, or `presentation/`.

## 2. Tech Stack & Project Structure
Organize as a clean monorepo:
- **`backend/` (Python 3.12+ managed with `uv`):**
  - FastAPI, Pydantic v2, `httpx` (async Ollama client), `pytest`, `ruff`.
  - Include `pyproject.toml` and `uv.lock` setup instructions so `uv sync` and `uv run uvicorn app.main:app --reload` work immediately.
- **`frontend/` (React 19 + TypeScript + Vite + Tailwind CSS):**
  - IndexedDB persistence using `idb` or `dexie` (wrapped strictly inside an `IndexedDBLookRepository` adapter implementing `LookRepositoryPort` so v0.0.2 can store garment photos/blobs without hitting `localStorage` limits).
  - Vite dev proxy forwarding `/api/v1` to the FastAPI backend (`http://localhost:8000`).
- **Local AI Runtime (`Ollama` at `http://localhost:11434`):**
  - Backend `OllamaStylistAdapter` communicates with Ollama's `/api/chat` using Structured Outputs (`format` JSON Schema, `stream: false`, `temperature: 0.4`).
  - Default model configurable via `OLLAMA_MODEL` in `backend/.env` (default `llama3.2`).
  - **Health Check & Auto-Fallback:** Endpoint `GET /api/v1/system/ai-status` pings Ollama `/api/tags`, checks if `OLLAMA_MODEL` exists, auto-selects an installed model if available, or returns exact setup instructions (`ollama pull llama3.2`).

## 3. Core Domain Models & Provenance Rules
Implement identical conceptual schemas across Backend Domain and Frontend Domain (with explicit Mappers at API boundaries):
- `ColorToken`: `id`, `name`, `hex`, `hsl`, `lab` (`L`, `a`, `b`), `is_neutral`, `undertone` (`"warm" | "cool" | "neutral"`), `value` (`"light" | "medium" | "dark"`), `season_tags`.
- `GarmentSlot`: `"top" | "bottom" | "outerwear" | "footwear" | "accessory" | "full_body"`.
- `WardrobeItem` (extensible for v0.0.2 closet items): `id`, `slot`, `primary_color_id`, `secondary_color_ids`, `name`, `is_virtual: bool`, `image_ref?: string`.
- `RecommendationSource`: `"math_engine" | "ollama_ai"`.
- `OutfitRecommendation`:
  - `id`: UUID string
  - `source`: `RecommendationSource` (**must strictly distinguish computed vs. AI-generated recommendations**)
  - `source_label`: string (e.g., `"Computed · CIELAB + 60-30-10 Rules"` vs. `"AI Stylist · llama3.2"`)
  - `strategy`: `"classic" | "tonal" | "contrast" | "editorial" | "ai_curated"`
  - `items`: list of `{ slot: GarmentSlot, hex: string, color_name: string, matched_token_id: string, proportion_percentage: int }`
  - `styling_rationale`: string
  - `fabric_texture_tip`: optional string

## 4. Functional Requirements for v0.0.1 (Dual-Track Color Studio)
1. **Base Piece & Color Selection (Frontend):**
   - Curated grid of 30 realistic wardrobe colors grouped into *Core Neutrals* and *Statement/Accent Colors*.
   - Custom Hex/RGB color picker that calls `POST /api/v1/colors/match` (or local domain preview) to snap arbitrary colors to the nearest perceptual `ColorToken` via CIELAB ($\Delta E_{2000}$ or $\Delta E_{76}$) distance.
   - Optional `GarmentSlot` selector (`Top`, `Bottom`, `Outerwear`, `Footwear`) and **Occasion/Vibe** selector (`Casual`, `Smart Casual`, `Office`, `Date Night`).

2. **Track A — Mathematical & Rule-Based Engine (`CielabRuleEngineAdapter`):**
   - Exposed via `POST /api/v1/recommendations/computed` (and combined endpoint `POST /api/v1/recommendations/dual-track`).
   - Uses pure domain color-space math + wearable fashion heuristics (inspired by Sanzo Wada palettes) enforcing the **60-30-10 proportion rule** across 4 strategies: *Safe & Everyday*, *Monochromatic / Tonal*, *Balanced Contrast*, and *Editorial / Seasonal*.
   - Every card in the UI displays a distinct **`[Computed · Color Math]`** badge and rule explanation.

3. **Track B — Independent AI-Generated Pairings (`OllamaStylistAdapter`):**
   - Exposed via `POST /api/v1/recommendations/ai`.
   - Prompts Ollama to independently propose 2–3 complete outfit color combinations tailored to the selected base color, garment slot, and occasion, returning strict JSON validated by Pydantic.
   - Maps AI-returned hex values to the nearest `ColorToken` via the domain CIELAB matcher while preserving the AI's suggested color names, proportions, `styling_rationale`, and `fabric_texture_tip`.
   - Every AI card displays a distinct **`[AI Generated · <model-name>]`** badge (visually distinct from Computed cards) and a **"Regenerate AI Ideas"** button.
   - **Graceful Degradation:** Computed pairings render immediately; AI pairings stream/load asynchronously with a skeleton loader and show an actionable setup banner if Ollama is offline.

4. **Interactive Companion Shell & IndexedDB Saved Looks:**
   - Top-level navigation shell with active **Color Studio**, **Ollama Status Pill** (Connected + Model / Offline Setup Modal), `v0.0.1` version badge, and disabled placeholder tabs (`My Closet`, `Outfit Planner`, `Style Profile` — marked *"Coming in v0.0.2+"*).
   - **Source Filter Bar:** `All`, `Computed (Math)`, and `AI Generated` tabs so users can compare or isolate either engine.
   - **Lock & Remix** on computed palettes + **Saved Looks Drawer** backed by **IndexedDB** (preserving full `source` provenance badges).

## 5. Required Expansion Documentation (`docs/`)
Generate comprehensive, developer-ready documentation to guide expansion from `v0.0.1` onward:
1. **`README.md` (Root):** Quickstart guide with `uv` backend setup, `npm` frontend setup, Ollama installation/model pull (`ollama pull llama3.2`), running tests, and architecture overview.
2. **`docs/ARCHITECTURE.md`:**
   - Full Hexagonal Architecture diagram (ASCII/Mermaid) showing Domain, Application Ports, Driving Adapters (FastAPI, React), and Driven Adapters (Ollama, CIELAB Engine, IndexedDB).
   - Strict dependency rules, DTO mapping conventions, and step-by-step recipes for adding new adapters (e.g., swapping IndexedDB for cloud sync, adding a Vision model adapter for garment photos, or connecting a React Native/Flutter mobile client).
3. **`docs/API_SPECS.md`:**
   - Complete OpenAPI-aligned specification for all `/api/v1/...` endpoints (`health`, `ai-status`, `colors`, `colors/match`, `recommendations/computed`, `recommendations/ai`, `recommendations/dual-track`), including request/response JSON payloads, error codes (`503 OLLAMA_UNAVAILABLE`), and reserved v0.0.2+ endpoint contracts (`/wardrobe/items`, `/vision/extract-garment`).
4. **`docs/UI_AND_FUNCTIONAL_SPECS.md`:**
   - Detailed functional requirements, user flows, state machines (loading/offline/fallback states), visual design tokens, provenance badge rules (`Computed` vs. `AI Generated`), IndexedDB schema versioning strategy, and a phased feature matrix (`v0.0.1` → `v0.0.2 Digital Closet` → `v0.0.3 Vision Extraction` → `v0.1.0 Mobile Companion`).

## 6. Execution & Verification Steps
1. Scaffold `backend/` with `uv init`, configure `pyproject.toml`, and implement strict Hexagonal directories (`domain/`, `application/`, `infrastructure/`, `presentation/`, `tests/`).
2. Implement backend CIELAB color math, 30-color wardrobe dataset, `CielabRuleEngineAdapter`, `OllamaStylistAdapter`, FastAPI routes, and `pytest` unit + architecture boundary tests.
3. Scaffold `frontend/` with Vite + React + TypeScript + Tailwind, implementing matching Hexagonal layers (`domain/`, `application/`, `infrastructure/indexeddb/`, `infrastructure/api/`, `presentation/`).
4. Build the Dual-Track Color Studio UI, IndexedDB Saved Looks repository, Ollama status indicator, and `vitest` tests.
5. Write `README.md`, `docs/ARCHITECTURE.md`, `docs/API_SPECS.md`, and `docs/UI_AND_FUNCTIONAL_SPECS.md`, then verify both backend and frontend test suites and builds pass cleanly.