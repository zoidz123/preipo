# SpaceX Pre-IPO Command Center Design

## Goal

Build a visual front page for the SpaceX IPO moment: a 1950s space-race mission-control landing page centered on the live market-implied valuation of SpaceX from `xyz:SPCX`.

## Audience

The page is for general readers and mainstream investors who know SpaceX is culturally important but may not know crypto-native pre-IPO markets exist. The product should feel shareable and visually memorable, while the data handling is transparent enough to build credibility.

## Visual Direction

- North star: 1950s space-race posters meets a hard-edged spacecraft command center.
- Palette: blackbox cockpit base, red/orange/yellow command typography, aged off-white, teal/blue space accents.
- Geometry: no soft card UI; use angular clipped panels, hard borders, instrument rails, and mission labels.
- Imagery: AI-generated retro-futurist rocket/space-race artwork, not stock photography.
- Main chart: expressive custom line/trajectory chart, not candlesticks.

## Data Inputs

- Hyperliquid info endpoint: `POST https://api.hyperliquid.xyz/info`
- Candle request:
  - `type: "candleSnapshot"`
  - `coin: "xyz:SPCX"`
  - `interval: "1h"`
  - `startTime`: now minus 7 days
  - `endTime`: now
- Use each candle's `c` field as the closing price.
- Derive the latest displayed price from the latest candle close.
- Use `v` for chart-volume context when available.
- Open interest is required in the hero, but can be `--` until the exact Hyperliquid metadata endpoint is wired.

## Valuation Formula

Use the preliminary S-1 common-equivalent base:

```txt
6,932,508,000 Class A shares + 5,602,790,410 Class B shares = 12,535,298,410 shares
```

```txt
implied valuation = latest SPCX close * 12,535,298,410
```

Label this as S-1 implied valuation. Explain that it uses Class A + Class B shares outstanding disclosed in the preliminary S-1 as of May 1, 2026, after the Class C reclassification, preferred conversion, and 2026 stock split. It excludes future IPO shares and certain dilutive securities.

## Page Structure

1. Hero command deck:
   - Huge implied valuation.
   - Price, volume, and open interest above or adjacent to the chart.
   - 7D/1H custom line chart using close prices.
   - Countdown to June 12, 2026.
   - Small source credit area for Hyperliquid/trade[XYZ], not a headline mention.
2. Signal feed:
   - Backend-polled Twitter/X, Reddit, and news cards.
   - First version can use curated/static sample cards until the backend poller exists.
3. S-1 radar:
   - Short summary of the registration statement.
   - Share-count caveat and market-structure explanation.
4. Public-market rank:
   - Compare the implied valuation to major U.S. public equities.
   - First version can use a static ranked dataset, clearly marked as reference data.
5. Index inclusion:
   - Explain why size alone is not enough.
   - Cover float, liquidity, seasoning, committee/index methodology, and timing caveats.

## Technical Direction

- Use React + Vite.
- Use custom SVG/React charting for maximum expressibility; avoid candlestick libraries.
- Put data fetching behind a small API helper so the chart can fall back to seeded candles if the API fails.
- Add unit tests for valuation math and candle transformation before implementation.

## First-Version Scope

Build the front-end site with live candle fetching, live valuation math, generated visual assets, responsive layout, and static placeholders for social/news/rank/index sections. Do not build a backend poller in the first slice.
