import { describe, expect, it } from "vitest";
import {
  S1_COMMON_SHARE_BASE,
  REPORTED_IPO_VALUATION_RANGE,
  calculateImpliedValuation,
  calculatePriceFromValuation,
  calculateOpenInterestNotional,
  extractSpcxMarketContext,
  getCandleWindow,
  getCandleAtRatio,
  getLatestClose,
  normalizeCandles,
} from "./spcx";

describe("SPCX market helpers", () => {
  it("uses the candle c field as the displayed close price", () => {
    const candles = normalizeCandles([
      { t: 1, T: 2, s: "xyz:SPCX", i: "1h", o: "180", c: "207.17", h: "210", l: "170", v: "108.77", n: 116 },
    ]);

    expect(candles[0].close).toBe(207.17);
    expect(getLatestClose(candles)).toBe(207.17);
  });

  it("calculates implied valuation from S-1 Class A plus Class B share base", () => {
    expect(S1_COMMON_SHARE_BASE).toBe(12_535_298_410);
    expect(calculateImpliedValuation(207.17)).toBeCloseTo(2_596_937_771_599.7, 1);
  });

  it("converts the reported IPO valuation range into SPCX prices", () => {
    expect(calculatePriceFromValuation(REPORTED_IPO_VALUATION_RANGE.low)).toBeCloseTo(139.6058, 4);
    expect(calculatePriceFromValuation(REPORTED_IPO_VALUATION_RANGE.high)).toBeCloseTo(159.5495, 4);
  });

  it("converts Hyperliquid open interest units into notional dollars", () => {
    expect(calculateOpenInterestNotional(231_715.42, 207.33)).toBeCloseTo(48_041_558, 1);
    expect(calculateOpenInterestNotional(null, 207.33)).toBeNull();
  });

  it("returns null when there is no latest close", () => {
    expect(getLatestClose([])).toBeNull();
    expect(calculateImpliedValuation(null)).toBeNull();
  });

  it("extracts SPCX market context from the xyz dex metadata response", () => {
    const context = extractSpcxMarketContext([
      {
        universe: [
          { name: "xyz:TSLA", szDecimals: 3, maxLeverage: 10, marginTableId: 10 },
          { name: "xyz:SPCX", szDecimals: 2, maxLeverage: 5, marginTableId: 5 },
        ],
      },
      [
        { openInterest: "100", dayNtlVlm: "50", markPx: "200" },
        { openInterest: "231715.42", dayNtlVlm: "22753947.6540999934", markPx: "207.33" },
      ],
    ]);

    expect(context).toEqual({
      dayNotionalVolume: 22_753_947.6540999934,
      markPrice: 207.33,
      openInterest: 231_715.42,
    });
  });

  it("selects the nearest candle by chart scrub ratio", () => {
    const candles = normalizeCandles([
      { t: 10, T: 19, s: "xyz:SPCX", i: "1h", o: "1", c: "100", h: "101", l: "99", v: "1", n: 1 },
      { t: 20, T: 29, s: "xyz:SPCX", i: "1h", o: "1", c: "200", h: "201", l: "199", v: "1", n: 1 },
      { t: 30, T: 39, s: "xyz:SPCX", i: "1h", o: "1", c: "300", h: "301", l: "299", v: "1", n: 1 },
    ]);

    expect(getCandleAtRatio(candles, 0)?.close).toBe(100);
    expect(getCandleAtRatio(candles, 0.49)?.close).toBe(200);
    expect(getCandleAtRatio(candles, 1)?.close).toBe(300);
  });

  it("uses 1h candles for 1D and 4h candles for wider ranges", () => {
    const now = Date.UTC(2026, 4, 24);

    expect(getCandleWindow("1D", now)).toMatchObject({
      interval: "1h",
      startTime: now - 24 * 60 * 60 * 1000,
      endTime: now,
    });
    expect(getCandleWindow("1W", now).interval).toBe("4h");
    expect(getCandleWindow("1M", now).interval).toBe("4h");
  });
});
