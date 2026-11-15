# Atelier Pal — Personal Styling Companion (`v0.0.1`)

A local-first **Personal Styling Companion** built with **Strict Hexagonal Architecture (Ports & Adapters)** and a **Dual-Track Color Pairing Engine** combining deterministic CIELAB color-space math with an independent local Ollama AI stylist.

## Architecture Overview

- **Backend (`backend/`):** Python 3.12+ (managed with `uv`), FastAPI, Pydantic v2, `httpx`. All color math, 60-30-10 styling rules, and Ollama AI orchestration live behind `/api/v1/...` endpoints so future Web and Mobile (iOS/Android) clients consume the exact same API.
- **Frontend (`frontend/`):** React 19 + TypeScript + Vite + Tailwind CSS + IndexedDB (`idb`). Enforces matching Hexagonal boundaries (`domain/`, `application/`, `infrastructure/`, `presentation/`).
- **Local AI (`Ollama`):** Connects to `http://localhost:11434` using Structured Outputs (`format` JSON schema, `temperature: 0.4`). Gracefully degrades if Ollama is offline—Track A (Computed) always renders immediately.

---

## Quickstart

### 1. Backend Setup (`uv`)

```bash
cd backend
cp .env.example .env
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Verify the API is running:
- Health: `GET http://localhost:8000/api/v1/health`
- OpenAPI Docs: `http://localhost:8000/docs`

### 2. Local AI Setup (`Ollama`)

Install [Ollama](https://ollama.com/) and pull the default model configured in `backend/.env`:

```bash
ollama serve
ollama pull llama3.2
```

If `llama3.2` is not installed, `GET /api/v1/system/ai-status` will automatically fall back to another locally installed model if available, or return exact setup instructions.

### 3. Frontend Setup (`npm`)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api/v1` requests to `http://localhost:8000`.

---

## Running Tests & Linters

### Backend (`pytest` + `ruff`)

```bash
cd backend
uv run pytest -v
uv run ruff check app tests
```

### Frontend (`vitest` + TypeScript build)

```bash
cd frontend
npm test
npm run build
```

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Hexagonal Architecture, dependency rules, DTO mappers, and adapter expansion recipes.
- [docs/API_SPECS.md](docs/API_SPECS.md) — Complete `/api/v1` OpenAPI-aligned endpoint specifications & v0.0.2+ reserved contracts.
- [docs/UI_AND_FUNCTIONAL_SPECS.md](docs/UI_AND_FUNCTIONAL_SPECS.md) — User flows, state machines, provenance badges, IndexedDB versioning, and roadmap.
