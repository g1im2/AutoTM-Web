# Repository Guidelines

## Project Structure & Module Organization
This is a Vue 3 + Vite + TypeScript frontend. Core code lives in `src/` with feature areas organized by domain:
- `src/modules/` for feature pages and layouts.
- `src/components/` for shared UI components.
- `src/router/` for route definitions.
- `src/stores/` for Pinia state.
- `src/api/` for Axios clients and typed request helpers.
- `src/assets/` and `public/` for static assets.
Entry points are `src/main.ts` and `src/App.vue`, with global styles in `src/style.css` and `src/styles/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the Vite dev server (defaults to port 5173).
- `npm run build`: type-check with `vue-tsc` and build the production bundle.
- `npm run preview`: serve the production build locally for verification.

## Coding Style & Naming Conventions
Follow existing project conventions: 2-space indentation, single quotes, no semicolons, and Vue SFCs in `<template>/<script setup lang="ts">/<style>` order. Prefer `PascalCase` for Vue components, `camelCase` for variables/functions, and `kebab-case` for CSS classes. Keep API helpers in `src/api/` and route-specific UI in `src/modules/`.

## Testing Guidelines
No test runner is configured in this repository. If you plan to add tests, propose the framework and directory layout first (e.g., `src/__tests__/` or colocated `*.spec.ts`) so the team can align on tooling and CI expectations.

## Commit & Pull Request Guidelines
Git history shows minimal conventions (e.g., “ignore: add git ignore file”), so keep commits short, imperative, and scoped (example: `ui: refine portfolio cards`). PRs should include a clear summary, linked issues, and screenshots or recordings for UI changes.

## Configuration & Environment
API calls use Axios clients in `src/api/clients.ts` with `VITE_API_GATEWAY` as the base URL. Auth tokens are read from `localStorage` under `auth_token`. For local development, keep environment variables in a `.env.local` file (not committed).
