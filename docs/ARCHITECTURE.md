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
Client is exposed on LAN, but LAN firewalls prevent WAN to LAN access 

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

| Image | Inherits from | Contains |
|---|---|---|
| `base-python` | `python:3.12-slim` | Pure Python stdlib | Completed May 25 2026
| `base-webserver` | `base-python` | FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic, bcrypt, python-jose | Completed May 25 2026
| `base-frontend` | `node:slim` | Vite, React, ReactDOM, TailwindCSS |
| `base-security` | `base-python` | scapy, impacket, cryptography, paramiko |

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

| Phase | Component | Delivers |
|---|---|---|
| **V1.1** | Orchestrator core | Auth, panel registry, layout storage, JWT issuance |
| **V1.2** | Dashboard shell | React frontend, UI signal bus, panel loader, layout customization |
| **V1.3** | Task Management Service | Full standalone service — backend, DB, panel Web Component, orchestrator registration |
| **V1.4** | Base Docker images | Base Python, webserver, frontend, security tooling images |
| **V1.5** | Dev VM | Blast radius containment for automations and security tool dev |
| **V2.1** | Orchestrator event bus | Backend pub/sub — services start communicating |
| **V2.2** | Systems Health Service | Wazuh alerts, container stats, system health panel |
| **V2.3** | Career Pipeline Service | Job tracker, application tool, follow-up publisher |
| **V2.4** | Social Presence Service | LinkedIn, comms, search hit tracking |
| **V3.1** | Shared Postgres | SQLite per service → shared Postgres |
| **V3.2** | Orchestrator resource management | Service health monitoring, resource allocation |
| **V3.3** | Data layer | PgBouncer — connection pooling, query routing, audit |
| **V4.1** | Orchestrator swarm assignment | Additional node onboarding, compute distribution |

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

### Queue Algorithm

Note: This queue is experimental and primarily directed at neurodivergent workstyles. The rules engine is set to be severely customizable to different workstyles. To be blunt, this works for me.

The queue is produced by a pipeline of discrete, replaceable rules applied in order:

| Order | Rule | Responsibility |
|---|---|---|
| 1 | `BlockFilterRule` | Remove tasks blocked until a future time |
| 2 | `ModeFilterRule` | Filter by work type per current mode |
| 3 | `AgingRule` | Promote tasks overdue for surfacing |
| 4 | `BucketSlotRule` | Fill slots per MLFQ bucket weights (8/5/2/1) |
| 5 | `DifficultyAlternationRule` | Avoid consecutive Hard tasks |
| 6 | `EnjoyabilityRule` | Apply adenosine cost rules |
| 7 | `PlatformRotationRule` | No more than 2 consecutive same-platform tasks |
| 8 | `UrgencyStripRule` | Strip urgency field — always last |

Urgency is an internal scheduling value. It is computed at creation, drives bucket placement, and is never serialized into any API response. It never leaves the backend.

### MLFQ Buckets

| Bucket | Label | Slots per cycle |
|---|---|---|
| 0 | Urgent | 8 |
| 1 | Normal | 5 |
| 2 | Low | 2 |
| 3 | Maintain | 1 |

Bucket 3 always gets a slot. Nothing starves.

### Enjoyability Rules

| Enjoyability | Rule |
|---|---|
| High | No restriction |
| Medium | Alternate with High when possible |
| Low | Never two consecutive |
| Dread | Always followed by High — hard rule, no exceptions |

### Mode

| Mode | Surfaces |
|---|---|
| Deep-Work | Deep-Work, Light-Work, Phone-Work tasks |
| Light-Work | Light-Work, Phone-Work tasks |
| Phone-Work | Phone-Work only |

Modes reflect both energy level and attention availability. Deep work assumes full attention on platform, Light work assumes a measure of multitasking with non-platform activities, Phone-work assumes minimal interaction.
Mode is owned by Task Management in V1. It will be promoted to the orchestrator when and if a second service requires mode awareness. Mode change is a filter — it does not trigger a queue recompute.

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
