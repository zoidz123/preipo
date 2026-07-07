export const HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info";
export const SPCX_COIN = "xyz:SPCX";
export const S1_COMMON_SHARE_BASE = 12_535_298_410;
export const REPORTED_IPO_VALUATION_RANGE = {
  low: 1_750_000_000_000,
  high: 2_000_000_000_000,
};
export const SPCX_TIMEFRAMES = ["1D", "1W", "1M"] as const;

export type SpcxTimeframe = (typeof SPCX_TIMEFRAMES)[number];

export type HyperliquidCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

export type SpcxCandle = {
  time: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  trades: number;
};

export type SpcxMarketContext = {
  dayNotionalVolume: number | null;
  markPrice: number | null;
  openInterest: number | null;
};

type MetaAndAssetCtxsResponse = [
  {
    universe: Array<{
      name: string;
      szDecimals: number;
      maxLeverage: number;
      marginTableId: number;
    }>;
  },
  Array<{
    openInterest?: string;
    dayNtlVlm?: string;
    markPx?: string;
  }>,
];

export function normalizeCandles(candles: HyperliquidCandle[]): SpcxCandle[] {
  return candles
    .map((candle) => ({
      time: candle.t,
      close: Number(candle.c),
      open: Number(candle.o),
      high: Number(candle.h),
      low: Number(candle.l),
      volume: Number(candle.v),
      trades: candle.n,
    }))
    .filter((candle) => Number.isFinite(candle.close))
    .sort((a, b) => a.time - b.time);
}

export function getLatestClose(candles: SpcxCandle[]): number | null {
  return candles.length > 0 ? candles[candles.length - 1].close : null;
}

export function getCandleAtRatio(candles: SpcxCandle[], ratio: number): SpcxCandle | null {
  if (candles.length === 0) return null;
  const clamped = Math.min(1, Math.max(0, ratio));
  const index = Math.round(clamped * (candles.length - 1));
  return candles[index] ?? null;
}

export function calculateImpliedValuation(close: number | null): number | null {
  return close === null ? null : close * S1_COMMON_SHARE_BASE;
}

export function calculatePriceFromValuation(valuation: number): number {
  return valuation / S1_COMMON_SHARE_BASE;
}

export function calculateOpenInterestNotional(openInterest: number | null, price: number | null): number | null {
  if (openInterest === null || price === null) return null;
  return openInterest * price;
}

export function formatCurrency(value: number | null, compact = true): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1_000 ? 2 : 2,
    notation: compact ? "compact" : "standard",
  }).format(value);
}

export function formatValuation(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  return formatCurrency(value);
}

export function getCandleWindow(timeframe: SpcxTimeframe, now = Date.now()) {
  const rangeMs = {
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  } satisfies Record<SpcxTimeframe, number>;

  return {
    interval: timeframe === "1D" ? "1h" : "4h",
    startTime: now - rangeMs[timeframe],
    endTime: now,
  };
}

export async function fetchSpcxCandles(timeframe: SpcxTimeframe = "1W"): Promise<SpcxCandle[]> {
  const { interval, startTime, endTime } = getCandleWindow(timeframe);
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: {
        coin: SPCX_COIN,
        interval,
        startTime,
        endTime,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid request failed: ${response.status}`);
  }

  const data = (await response.json()) as HyperliquidCandle[];
  return normalizeCandles(data);
}

function finiteNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractSpcxMarketContext(response: MetaAndAssetCtxsResponse): SpcxMarketContext {
  const [meta, assetContexts] = response;
  const spcxIndex = meta.universe.findIndex((asset) => asset.name === SPCX_COIN);
  const context = spcxIndex >= 0 ? assetContexts[spcxIndex] : undefined;

  return {
    dayNotionalVolume: finiteNumber(context?.dayNtlVlm),
    markPrice: finiteNumber(context?.markPx),
    openInterest: finiteNumber(context?.openInterest),
  };
}

export async function fetchSpcxMarketContext(): Promise<SpcxMarketContext> {
  const response = await fetch(HYPERLIQUID_INFO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "metaAndAssetCtxs",
      dex: "xyz",
    }),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid context request failed: ${response.status}`);
  }

  return extractSpcxMarketContext((await response.json()) as MetaAndAssetCtxsResponse);
}

export const seededMarketContext: SpcxMarketContext = {
  dayNotionalVolume: 22_753_947.6540999934,
  markPrice: 207.33,
  openInterest: 231_715.42,
};

export const seededCandles: SpcxCandle[] = normalizeCandles([
  { t: 1779055200000, T: 1779058799999, s: SPCX_COIN, i: "1h", o: "180.0", c: "180.0", h: "180.0", l: "179.9", v: "7395.79", n: 228 },
  { t: 1779058800000, T: 1779062399999, s: SPCX_COIN, i: "1h", o: "180.0", c: "216.0", h: "216.0", l: "180.0", v: "18489.33", n: 1613 },
  { t: 1779062400000, T: 1779065999999, s: SPCX_COIN, i: "1h", o: "216.0", c: "226.9", h: "230.0", l: "209.27", v: "43743.76", n: 3757 },
  { t: 1779066000000, T: 1779069599999, s: SPCX_COIN, i: "1h", o: "226.7", c: "213.68", h: "229.99", l: "210.2", v: "31200.13", n: 2472 },
  { t: 1779152400000, T: 1779155999999, s: SPCX_COIN, i: "1h", o: "208.1", c: "211.4", h: "215.6", l: "205.8", v: "8400.1", n: 582 },
  { t: 1779238800000, T: 1779242399999, s: SPCX_COIN, i: "1h", o: "198.0", c: "204.8", h: "207.1", l: "193.2", v: "6920.2", n: 490 },
  { t: 1779325200000, T: 1779328799999, s: SPCX_COIN, i: "1h", o: "202.2", c: "218.7", h: "222.9", l: "201.4", v: "12650.7", n: 1097 },
  { t: 1779411600000, T: 1779415199999, s: SPCX_COIN, i: "1h", o: "219.1", c: "223.6", h: "228.0", l: "216.2", v: "15790.6", n: 1205 },
  { t: 1779498000000, T: 1779501599999, s: SPCX_COIN, i: "1h", o: "220.4", c: "214.9", h: "224.3", l: "211.0", v: "9350.4", n: 760 },
  { t: 1779584400000, T: 1779587999999, s: SPCX_COIN, i: "1h", o: "212.2", c: "207.17", h: "215.0", l: "204.9", v: "108.77", n: 116 },
]);
