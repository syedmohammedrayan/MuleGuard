# MuleGuard — Frontend

The web user interface for MuleGuard, built with React, Vite, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Interactive 2D Force-Directed Graph:** WebGL/Canvas network rendering using `react-force-graph-2d`.
- **Forensic Dashboards:** Overview, Transactions, Patterns, Analytics, and Settings views.
- **Side Panel Account Inspection:** Detailed drill-down for selected accounts and fraud rings.
- **Client-Side Fallback:** Automatic offline simulation mode if the backend service is offline.
- **JSON Report Export:** One-click forensic audit report export.

## Scripts

From this directory:

- `npm run dev` — Starts the Vite development server on `http://127.0.0.1:8080`.
- `npm run build` — Compiles TypeScript and builds the production bundle into `dist/`.
- `npm run preview` — Locally preview the production build.
- `npm run test` — Run unit and component tests with Vitest.

## Configuration

- **Host & Port:** Bound to `127.0.0.1:8080` in `vite.config.ts`.
- **API Target:** Set to `http://127.0.0.1:8001` in `src/services/api.ts`.

