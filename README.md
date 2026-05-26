# Union

A modular, self-hosted infrastructure platform. Independent services communicate through a central orchestrator. A dashboard provides a unified control panel over the entire system.

Built for daily use. Designed to stay up, stay secure, and grow without accumulating architectural debt.

---

## The idea

Most personal infrastructure grows sideways — a script here, a cron job there, tools that don't know about each other. Union is an attempt to build it the right way from the start: a real architecture with real separation of concerns, running on hardware I own, with no external dependencies at runtime.

The mental model is simple:

```
Orchestrator = engine
Dashboard = control panel
Services   = independent workers
```

The dashboard is not the engine. If the engine fails, the control panel stays up and shows you what failed. Services are independent — one going down doesn't cascade.

---

## Status

Actively in development. V1 is the foundation — orchestrator, dashboard, and the first service. Later phases add more services, an event bus, shared infrastructure, and eventually multi-node compute distribution.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design and roadmap. See [devlog](docs/devlog/) for build notes.

---

## Design principles

A few that drive every decision:

**Services own their data.** Each service has its own database, its own backend, its own panel frontend. Nothing is shared in V1. The database layer evolves deliberately in later phases — SQLite per service now, shared Postgres when it earns it, a connection pooling proxy after that.

**The dashboard never executes.** It sends commands to the orchestrator. The orchestrator executes. This separation means the dashboard can stay up and show you the system state even when the engine is down.

**Supply chain is controlled from day one.** All base Docker images are pulled from upstream once and pushed to a local registry. Nothing reaches out to external registries at build time. Every external artifact is logged with its cryptographic digest and a software bill of materials at intake.

**Security is structural, not bolted on.** JWT signing uses RS256. Sensitive data lives on encrypted volumes that the services hard-fail without. Panel frontends are checksum-verified before the dashboard loads them.

---

## Stack

| Layer | Technology |
|---|---|
| Service backends | FastAPI + Uvicorn |
| Databases | SQLite → Postgres (phased) |
| Migrations | Alembic |
| Panel frontends | Web Components |
| Dashboard frontend | React + Vite |
| Styling | TailwindCSS |
| Containers | Docker + Compose |

---

## Repository layout

```
union/
    orchestrator/       Engine — auth, panel registry, JWT, layout storage
    dashboard/          Control panel — React shell, Web Component loader
    task-management/    First service — queue, focus mode, platform tracking
    scripts/            Operational tooling
    docs/
        ARCHITECTURE.md
        devlog/
```

---

## What this is not

This is not a framework, a library, or something you can install. It's a personal infrastructure platform built for a specific operational context. The architecture decisions are documented because they're interesting, not because this is intended for general use.
