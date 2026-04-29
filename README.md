# 3D XR Studio

Web authoring tool for geo-referenced XR environments and guided tours.

## Repository Layout

```
eurekafrontend/   React SPA — 3D XR Studio authoring UI
eurekabackend/    Node.js / Express API — persistence and orchestration
tools/            Build & maintenance utilities
```

## Features

- Geo-referenced environments with map-based authoring (lat/lon + local Cartesian coordinates).
- Totems, points of interest and ordered tour stops as scene primitives.
- In-browser 3D preview of imported meshes.
- JWT-based authentication, per-user ownership of resources.
- Localization: it / en (extendable).

## Stack

- **Frontend**: React, React Router, axios, Three.js, Leaflet (Vite build).
- **Backend**: Node.js, Express, SQL persistence, JWT auth.
- **3D inference (optional)**: external TRELLIS service for image-to-3D, orchestrated through an internal job queue.

## Quick Start

### Backend

```bash
cd eurekabackend
cp .env.example .env       # fill in DB / JWT / TRELLIS settings
npm install
npm start
```

### Frontend

```bash
cd eurekafrontend
npm install
npm run dev                # development
npm run build              # production bundle (output: dist/, not tracked)
```

## Configuration

Backend reads its configuration from `eurekabackend/.env` (see `.env.example` for the full list of variables: DB connection, `JWT_SECRET`, `TRELLIS_API_URL`, upload paths).

## Notes

- 3D asset generation is provided by a companion application (AI 3D Builder), out of scope for this repository.
- Build artifacts (`dist/`, `build/`) and runtime data (`uploads/`, `data/`) are not versioned.
