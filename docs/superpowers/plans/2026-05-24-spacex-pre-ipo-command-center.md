# SpaceX Pre-IPO Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React/Vite landing page for a live SpaceX pre-IPO command center using `xyz:SPCX` 7D/1H candle closes and the S-1 share denominator.

**Architecture:** The app is a static client-side React app with a small data layer for Hyperliquid candles, pure helpers for valuation and candle formatting, and focused presentational components for the hero chart, mission panels, social feed, S-1 summary, rank table, and index explainer. The first version uses live candle fetch with seeded fallback data.

**Tech Stack:** React, Vite, TypeScript, Vitest, SVG charting, CSS modules/global CSS, AI-generated raster hero asset.

---

### File Structure

- `package.json`: scripts and dependencies.
- `index.html`: app shell.
- `src/main.tsx`: React entrypoint.
- `src/App.tsx`: page composition.
- `src/styles.css`: design tokens and all page styling.
- `src/lib/spcx.ts`: constants, valuation math, candle transform, Hyperliquid fetcher.
- `src/lib/spcx.test.ts`: unit tests for close-price extraction and valuation math.
- `src/components/HeroCommand.tsx`: first viewport and chart composition.
- `src/components/SignalFeed.tsx`: static social/news cards.
- `src/components/ResearchSections.tsx`: S-1, market rank, and index inclusion sections.
- `src/assets/`: generated hero artwork.

### Task 1: Scaffold and Data Tests

- [ ] Create Vite/React/TypeScript files.
- [ ] Write `src/lib/spcx.test.ts` first with tests for using candle `c`, calculating implied valuation, and tolerating empty candle arrays.
- [ ] Run `npm test -- --run src/lib/spcx.test.ts` and confirm tests fail because `src/lib/spcx.ts` is missing.
- [ ] Implement `src/lib/spcx.ts`.
- [ ] Re-run the tests and confirm they pass.

### Task 2: Command Center Hero

- [ ] Build `HeroCommand.tsx` with valuation, price, volume, open interest placeholder, countdown, source credit, and SVG line chart.
- [ ] Wire `App.tsx` to fetch candles via `fetchSpcxCandles()` and fall back to seeded candles.
- [ ] Use `c` as chart price and latest price.
- [ ] Style the first viewport as a blackbox 1950s mission-control deck with angular panels and no rounded cards.

### Task 3: Generated Image Asset

- [ ] Generate a retro 1950s space-race rocket poster image for the hero background.
- [ ] Save it under `src/assets/`.
- [ ] Blend it into the hero without obscuring data or text.

### Task 4: Below-Fold Sections

- [ ] Add static social/news cards in `SignalFeed.tsx`.
- [ ] Add S-1 share-count caveat, public-market ranking reference, and index inclusion explainer in `ResearchSections.tsx`.
- [ ] Keep all sections in the same angular command-center visual system.

### Task 5: Verification

- [ ] Run unit tests.
- [ ] Run production build.
- [ ] Start local dev server.
- [ ] Open in the in-app browser.
- [ ] Verify desktop and mobile responsiveness.
- [ ] Confirm live candles load or seeded fallback renders cleanly.
- [ ] Compare the implementation against the accepted retro mission-control concept and fix visible drift.

### Self-Review

- Spec coverage: live price, 7D/1H chart, close-price usage, S-1 valuation denominator, countdown, generated imagery, social/S-1/rank/index sections are covered.
- Placeholder scan: open interest may be displayed as unavailable until its endpoint is wired, which is an explicit first-version limitation.
- Type consistency: candle fields use Hyperliquid shape `t`, `T`, `s`, `i`, `o`, `c`, `h`, `l`, `v`, `n`.
