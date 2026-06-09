# Union System — Architecture

Union is a modular, self-hosted infrastructure platform. Independent services communicate through a central orchestrator. A dashboard provides a unified control panel over the entire system.
Union presents a Secret level security concern because it coordinates multiple tasks over multiple business purposes that can be correlated strongly.

---

## Core Mental Model

```
Orchestrator = engine
Dashboard = control panel
Services   = independent workers
```

The control panel is not the engine. If the engine fails, the control panel stays up and shows you what failed. Services are independent — one failing does not cascade.

---

## Architectural Principles

Every implementation decision is governed by these. They are non-negotiable.

| Principle | Statement |
|---|---|
| Orchestrator is the engine | Auth, panel registry, inter-service communication, resource management |
| Dashboard is the control panel | UX only — thin backend for UI state and command relay |
| Services are independent | Own container, own backend, own DB, own panel frontend |
| Dashboard stays up when orchestrator fails | Shows failure state — never goes down with orchestrator |
| Inter-service communication through orchestrator | Services never talk directly to each other |
| Dashboard never executes | Sends commands to orchestrator — orchestrator executes |
| Panel frontend is a Web Component | Framework agnostic, self-contained, dashboard inserts custom element |
| Orchestrator verifies panels | Dashboard only loads orchestrator-verified panels |
| Database evolves in layers | SQLite per service → shared Postgres → data layer proxy |
| Air-gapped deployment | Orchestrator never exposed externally |

---

## System Map

```
SERVER
    ├── Orchestrator container
    ├── Dashboard container       
    ├── Task Management container
    └── Future service containers

CLIENT (WireGuard tunnel)
    └── Browser → SERVER
```

Access is exclusively through a WireGuard tunnel. No services are forwarded externally.
The server is considered a critical resource and has no direct access to internet facing router.
Client is exposed on LAN, but LAN firewalls prevent WAN to LAN access.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Service backends | FastAPI + Uvicorn |
| Orchestrator backend | FastAPI + Uvicorn |
| Dashboard backend | FastAPI + Uvicorn (thin — UI state only) |
| Databases V1 | SQLite via SQLAlchemy |
| Migrations | Alembic (every service, from day one) |
| Service panel frontends | Web Components |
| Dashboard shell frontend | React + Vite |
| Styling | TailwindCSS |
| Containerization | Docker + Compose (resource caps on all containers) |
| Base images | Local registry mirror — supply chain controlled |

### Base Docker Images

| Image | Inherits from | Contains | Status |
|---|---|---|---|
| `base-python` | `python:3.12-slim` | Pure Python stdlib | Complete — May 25 2026 |
| `base-webserver` | `base-python` | FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic, bcrypt, python-jose | Complete — May 25 2026 |
| `base-frontend` | `node:slim` | Vite, React, ReactDOM, TailwindCSS | Complete — May 28 2026 |
| `base-security` | `base-python` | scapy, impacket, cryptography, paramiko | Planned |

All base images are pulled from upstream once, pushed to a local registry, and never pulled from outside again. Build-time supply chain is fully controlled.

### Database Evolution

| Phase | Model |
|---|---|
| V1 | SQLite per service |
| V3.1 | Shared Postgres — each service owns its own schema |
| V3.3 | PgBouncer data layer — services never connect to Postgres directly |

SQLAlchemy ORM throughout. The Postgres migration is a connection string swap plus an Alembic migration. No application code changes.

---

## Build Roadmap

| Phase | Component | Delivers | Status |
|---|---|---|---|
| **V1.1** | Orchestrator core | Auth, panel registry, layout storage, JWT issuance | Complete — May 25 2026 |
| **V1.2** | Dashboard shell | React frontend, UI signal bus, panel loader, layout customization | Complete — Jun 7 2026 |
| **V1.3** | Task Management Service | Full standalone service — backend, DB, panel Web Component, orchestrator registration | Backend complete — Jun 8 2026. Panel frontend pending. |
| **V1.4** | Base Docker images | Base Python, webserver, frontend, security tooling images | Partial — base-security pending |
| **V1.5** | Dev VM | Blast radius containment for automations and security tool dev | ISO downloaded, VM not created |
| **V2.1** | Orchestrator event bus | Backend pub/sub — services start communicating | Planned |
| **V2.2** | Systems Health Service | Wazuh alerts, container stats, system health panel | Planned |
| **V2.3** | Career Pipeline Service | Job tracker, application tool, follow-up publisher | Planned |
| **V2.4** | Social Presence Service | LinkedIn, comms, search hit tracking | Planned |
| **V3.1** | Shared Postgres | SQLite per service → shared Postgres | Planned |
| **V3.2** | Orchestrator resource management | Service health monitoring, resource allocation | Planned |
| **V3.3** | Data layer | PgBouncer — connection pooling, query routing, audit | Planned |
| **V4.1** | Orchestrator swarm assignment | Additional node onboarding, compute distribution | Planned |

---

## Authentication

```
User opens dashboard
    → Dashboard checks JWT cookie
    → No JWT → redirect to login
    → Login POSTs credentials to orchestrator /auth/login
    → Orchestrator validates, issues JWT in httpOnly cookie
    → Dashboard shell loads
    → All service API calls include JWT cookie
    → Services validate JWT independently against orchestrator public key
    → Orchestrator goes down → JWT already issued, services still validate
    → Dashboard shows orchestrator unreachable state
```

JWT signing uses RS256. The private key never leaves the orchestrator. Services hold only the public key and validate independently — the system remains functional through orchestrator downtime. JWT is stored in an httpOnly cookie. Never localStorage. Never sessionStorage.

---

## Panel System

Services register themselves with the orchestrator at startup. The orchestrator validates the manifest, pings the service health endpoint, fetches the panel frontend, and verifies its checksum. Only verified panels appear on the dashboard.

```
Service starts
    → POST /panels/register  (manifest + checksum)
    → Orchestrator pings health endpoint
    → Orchestrator fetches frontend, verifies checksum
    → Panel marked verified
    → Panel appears in verified list
```

Panel frontends are Web Components. The dashboard shell has no knowledge of any framework used inside a panel. It injects `<panel-id-element>` into a layout slot and the panel is self-contained from that point.

Checksum verification is enforced both at registration and at load time. The dashboard verifies the checksum of every panel it loads against the orchestrator's record. A panel whose frontend has changed since registration will not load.

---

## Dashboard UI Signal Bus

A React Context pub/sub that operates at the UI layer only. No data payloads cross service boundaries through this bus — it carries UI coordination signals only.

| Signal | Publisher | Subscriber | Payload |
|---|---|---|---|
| `ui.focus.entered` | Any panel Web Component | Dashboard shell | `{panel_id}` |
| `ui.focus.exited` | Any panel Web Component | Dashboard shell | `{panel_id}` |
| `ui.panel.loaded` | Dashboard shell | Any subscriber | `{panel_id}` |
| `ui.orchestrator.unreachable` | Dashboard shell | All panels | `{}` |

When `ui.focus.entered` fires, the dashboard shell collapses all non-focused panels. This is distraction suppression at the UI layer — independent of any service's internal mode concept.

---

## Task Management Service

The first service. Solves the problem of work arriving from multiple platforms with no unified place to curate, prioritize, and execute against it in focused cognitive blocks.

**Status:** Backend complete and running. Panel Web Component (frontend) pending. Not yet wired to orchestrator.

### Data Model

| Table | Purpose |
|---|---|
| `tasks` | Core task records |
| `platforms` | Platform registry — data, not enums. Seeded: HackerOne, Bugcrowd, BTLO, HTB, FHSU, Manual |
| `task_artifacts` | Links and files attached to tasks |
| `sessions` | Work session records with performance scoring |
| `health_events` | Signal log — USER_REPORT, SIGNAL, SESSION_ORPHANED |
| `rules` | Configurable health rules |
| `rule_log` | Rule firing history |
| `hyperparameters` | All scheduling constants — stored as rows, never hardcoded |

**Computed fields (never stored):** `difficulty_label`, `difficulty_ordinal` — derived from enjoyability × work_type via lookup table at response time.

**Internal fields (never serialized):** `urgency` — used for scheduling, stripped by `UrgencyStripRule` before any API response leaves the backend.

**V2 data dependency present:** `queue_tier` (HOT/COLD) column exists and is nullable. Added before first migration so V2 pool feature requires no schema change to existing data.

### Queue Algorithm

Note: This queue is experimental and primarily directed at neurodivergent workstyles. The rules engine is severely customizable. To be blunt, this works for me.

The queue is produced by a pipeline of discrete, replaceable rules applied in order. Each rule is a registered function. Adding or changing behavior means one function — nothing else moves.

| Order | Rule | Responsibility |
|---|---|---|
| 1 | `BlockFilterRule` | DROP tasks with status BLOCKED |
| 2 | `ModeFilterRule` | DROP tasks whose work_type is not allowed in current mode |
| 3 | `AgingRule` | Increment top_n_cycles for surfaced tasks |
| 4 | `BucketSlotRule` | Enforce MLFQ slot counts per cycle |
| 5 | `DifficultyAlternationRule` | Sliding-window difficulty ceiling and step constraint |
| 6 | `EnjoyabilityRule` | DREAD always followed by ENJOYABLE — hard rule, no exceptions |
| 7 | `UrgencyStripRule` | Strip urgency from output — always last |

`UrgencyStripRule` is always last. Rules upstream of it depend on urgency values. Urgency never appears in any API response.

**Gap — V1.3.1:** `PlatformRotationRule` (no more than 2 consecutive same-platform tasks) is specified but not yet implemented. Requires platform tracking state threaded through the rule context.

### Aging

Separate from the rule pipeline. Formula:

```
urgency_increment = aging_rate * (
    due_date_weight(days_remaining)      # step function
    + time_in_system_weight(days_since)  # linear, capped at 30 days
    + top_n_weight(top_n_cycles / threshold)
)
urgency = min(urgency + increment, 10.0)
```

Sweeps run on session activation and every `aging_sweep_interval` minutes during a session. Urgency only moves upward via automation. Only the user reduces it. `urgency_base` preserves original user intent and is never touched by automation.

### MLFQ Buckets

| Bucket | Label | Slots per cycle |
|---|---|---|
| 0 | Urgent | 8 |
| 1 | Normal | 5 |
| 2 | Low | 2 |
| 3 | Maintain | 1 |

Bucket 3 always gets a slot. Nothing starves.

### Enjoyability and Difficulty

Difficulty is computed from the intersection of enjoyability and work_type. It is never stored — derived at response time.

| Enjoyability | Deep-Work | Light-Work | Phone-Work |
|---|---|---|---|
| Enjoyable | Ephemeral (1) | Trivial (2) | Light (3) |
| Pleasant | Trivial (2) | Light (3) | Moderate (5) |
| Neutral | Light (3) | Moderate (5) | Hard (7) |
| Difficult | Moderate (5) | Hard (7) | Severe (9) |
| Dread | Hard (7) | Severe (9) | Extreme (10) |

**Hard rule:** DREAD task is always followed by an ENJOYABLE task. The rule engine scans forward in the task list to find one if the next task is not ENJOYABLE. No exceptions.

### Mode

| Mode | Surfaces | Context |
|---|---|---|
| Deep-Work | All work types | Full attention, uninterrupted |
| Light-Work | Light-Work, Phone-Work | Interruptible |
| Phone-Work | Phone-Work only | After hours, caregiving context |

Mode is owned by Task Management in V1. Promoted to orchestrator when a second service needs it. Mode change is a filter — does not trigger recompute.

### Hyperparameters

All scheduling constants are stored in the `hyperparameters` table and adjustable at runtime via `PATCH /api/hyperparameters/{key}`. No hardcoded values in the rules engine.

| Key | Default | Controls |
|---|---|---|
| `aging_rate` | 1.2 | Urgency increment multiplier |
| `top_n_threshold` | 20 | Cycles before top_n aging kicks in |
| `bucket_0_slots` | 8 | MLFQ slots for bucket 0 |
| `bucket_1_slots` | 5 | MLFQ slots for bucket 1 |
| `bucket_2_slots` | 2 | MLFQ slots for bucket 2 |
| `bucket_3_slots` | 1 | MLFQ slots for bucket 3 |
| `cycle_length` | 11 | Total slots per cycle (sum of buckets) |
| `step_threshold` | 2 | Max difficulty ordinal jump between tasks |
| `difficulty_ceiling` | 12 | Max 3-task window difficulty sum |
| `difficulty_target` | 9 | Target 3-task window difficulty sum |
| `max_mounted_cards` | 3 | Max tasks displayed in mounted state |
| `break_budget_ratio` | 0.2 | Break budget as fraction of active time |
| `aging_sweep_interval` | 30 | Minutes between aging sweeps during session |

### Session and Performance Score

Sessions track active and break time. Performance score is computed on session end:

```
score = clamp(
    tasks_completed * 3.0
    + dread_completions * 10.0
    + active_minutes * 0.1
    - break_overage * 0.5,
    0, 100
)
```

Break overage is time beyond `active_minutes * break_budget_ratio`. Dread completions carry a bonus because finishing a dread task represents genuine adenosine cost absorbed.

Orphaned sessions (browser closed without ending) are auto-closed and logged as SESSION_ORPHANED health events.

### Service Auth

Two auth paths:

- **User routes** — validate JWT against orchestrator public key independently. Service stays functional through orchestrator downtime.
- **Intake endpoint** (`POST /api/tasks/intake`) — static bearer token. Used by orchestrator event bus in V2. Different from JWT auth by design.

---

## Supply Chain

All external artifacts — base Docker images, upstream packages — are logged at intake with their cryptographic digest and a generated SBOM. The local registry is the only source used at build time. Nothing reaches out to upstream registries during builds.

The supply chain log is the tamper-detection baseline. When a Supply Chain Service is built in V2, it will ingest this log, correlate digests and package versions against threat intel feeds, and surface findings on the dashboard.

---

## Repository Structure

```
union/
    orchestrator/
    dashboard/
    task-management/
    scripts/
    docs/
        ARCHITECTURE.md
        devlog/
    .gitignore
    README.md
```

Secrets, key material, local paths, and supply chain artifacts are never committed. The repository contains code and architecture only.
