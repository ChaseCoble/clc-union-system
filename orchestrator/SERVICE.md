# {{SERVICE_NAME}}
**Version:** {{X.Y}}
**Port:** {{PORT}}
**Status:** <!-- Active | Specced | Planned | Deprecated -->
**Stack:** <!-- e.g. FastAPI + Uvicorn + SQLite | Vite + Web Component | etc -->
**DB:** `{{DB_PATH}}`

---

## Purpose

<!-- One paragraph. What does this service own. What problem it solves. What it does NOT do. -->

---

## Data Flow

<!-- Required. Service-to-service only. Internal flow goes in API Routes section.
     Update this diagram whenever a new inter-service dependency is added. -->

```mermaid
graph TD
    ORCH[Orchestrator :8766]
    DASH[Dashboard :8765]
    THIS[{{SERVICE_NAME}} :{{PORT}}]

    THIS -->|"POST /panels/register"| ORCH
    ORCH -->|"GET /auth/public-key → JWT validation"| THIS
    DASH -->|"loads Web Component from statics/"| THIS
    %% Add service-specific flows below
```

---

## API Routes

<!-- Backend services only. Omit section if UX-only. -->

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/auth/...` | — | <!-- if applicable --> |

---

## Panel

<!-- Frontend/Web Component services only. Omit if raw server. -->

**Custom element:** `<{{service-name}}-panel>`
**Entry point:** `frontend/src/{{service_name}}_panel.js`
**Build output:** `statics/`
**Registers with orchestrator:** Yes — on startup via `POST /panels/register`

---

## Configuration

<!-- Key env vars. Full values in .config/.env — never document secrets here. -->

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Issued by orchestrator |
| `DB_PATH` | Yes | Path to SQLite DB — must be on mounted S-tier LUKS |
| `PORT` | Yes | Service port |

---

## Startup

```bash
# First time
cp .config/.env.example .config/.env   # fill in values
docker compose -f .config/docker-compose.yml up -d

# Subsequent
docker compose -f .config/docker-compose.yml up -d
```

**Prerequisites:**
- S-tier LUKS mounted at `/srv/union/data/s` — service will fail to start without it
- `union_network` Docker network exists — `docker network create union_network` if not

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/build.sh` | Build frontend, output to `statics/` |
| `scripts/keygen.sh` | <!-- if applicable --> |

---

## Known Issues / Gotchas

<!-- Anything that would confuse a debugger returning after 3 months.
     Short bullets only. If it needs prose, it belongs in DEVLOG.md. -->

-

---

## Version History

| Version | Change |
|---------|--------|
| {{X.Y}} | Initial |

---

## Current Spec Version

<!-- Link or reference the version of the union system spec this service was built against -->
**Union System Spec:** V{{X.Y}}
