import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import heroArtwork from "../assets/retro-space-race-hero.png";
import hyperliquidWordmark from "../assets/hyperliquid-wordmark.png";
import {
  calculateImpliedValuation,
  calculateOpenInterestNotional,
  formatCurrency,
  formatValuation,
  IPO_REFERENCE_DATE,
  SPCX_TIMEFRAMES,
  type SpcxMarketContext,
  type SpcxCandle,
  type SpcxTimeframe,
} from "../lib/spcx";

type HeroCommandProps = {
  candles: SpcxCandle[];
  dataState: "loading" | "live" | "fallback";
  latestClose: number | null;
  marketContext: SpcxMarketContext;
  timeframe: SpcxTimeframe;
  onTimeframeChange: (timeframe: SpcxTimeframe) => void;
};

function getCountdownParts(now = Date.now()) {
  const target = new Date(IPO_REFERENCE_DATE).getTime();
  const distance = Math.max(0, target - now);
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  const minutes = Math.floor((distance % 3_600_000) / 60_000);
  const seconds = Math.floor((distance % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

function formatTimestamp(time: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time));
}

function toChartTime(time: number) {
  return Math.floor(time / 1000) as UTCTimestamp;
}

function MissionChart({
  candles,
  dataState,
  marketContext,
  timeframe,
  selected,
  onSelect,
  onTimeframeChange,
}: {
  candles: SpcxCandle[];
  dataState: "loading" | "live" | "fallback";
  marketContext: SpcxMarketContext;
  timeframe: SpcxTimeframe;
  selected: SpcxCandle | null;
  onSelect: (candle: SpcxCandle | null) => void;
  onTimeframeChange: (timeframe: SpcxTimeframe) => void;
}) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const latest = candles[candles.length - 1];
  const oiNotional = calculateOpenInterestNotional(marketContext.openInterest, marketContext.markPrice ?? latest?.close ?? null);
  const isLoading = dataState === "loading" || candles.length === 0;

  useEffect(() => {
    onSelect(null);
  }, [candles, onSelect]);

  useEffect(() => {
    if (isLoading) return;

    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: Math.max(1, Math.floor(container.clientWidth)),
      height: Math.max(1, Math.floor(container.clientHeight)),
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(245, 243, 238, 0.58)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
      },
      grid: {
        horzLines: { color: "rgba(245, 243, 238, 0.08)" },
        vertLines: { color: "rgba(245, 243, 238, 0.035)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(67, 240, 154, 0.7)",
          labelBackgroundColor: "#111312",
          style: 2,
          width: 1,
        },
        horzLine: {
          color: "rgba(245, 243, 238, 0.26)",
          labelBackgroundColor: "#111312",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(245, 243, 238, 0.08)",
        scaleMargins: { top: 0.12, bottom: 0.16 },
      },
      timeScale: {
        borderColor: "rgba(245, 243, 238, 0.08)",
        rightOffset: 2,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        horzTouchDrag: true,
        mouseWheel: true,
        pressedMouseMove: true,
        vertTouchDrag: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#43f09a",
      downColor: "#c8aa64",
      borderUpColor: "#43f09a",
      borderDownColor: "#c8aa64",
      wickUpColor: "rgba(67, 240, 154, 0.9)",
      wickDownColor: "rgba(200, 170, 100, 0.9)",
      priceLineColor: "rgba(67, 240, 154, 0.55)",
      priceLineWidth: 1,
      lastValueVisible: true,
    });

    const chartData: CandlestickData[] = candles.map((candle) => ({
      time: toChartTime(candle.time),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    series.setData(chartData);
    chart.timeScale().fitContent();

    const resizeChart = () => {
      const { height, width } = container.getBoundingClientRect();
      chart.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
      chart.timeScale().fitContent();
    };

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeChart);
    });
    resizeObserver.observe(container);
    window.addEventListener("orientationchange", resizeChart);
    window.addEventListener("resize", resizeChart);

    const candlesByTime = new Map(candles.map((candle) => [toChartTime(candle.time), candle]));
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onSelect(null);
        return;
      }

      const hovered = candlesByTime.get(param.time as UTCTimestamp);
      onSelect(hovered ?? null);
    });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", resizeChart);
      window.removeEventListener("resize", resizeChart);
      chart.remove();
    };
  }, [candles, isLoading, onSelect]);

  return (
    <div className="chart-shell" aria-label={`SPCX ${timeframe} close price chart`}>
      <div className="chart-header">
        <div className="range-tabs" aria-label="Chart range">
          {SPCX_TIMEFRAMES.map((range) => (
            <button
              className={timeframe === range ? "active" : ""}
              key={range}
              type="button"
              onClick={() => onTimeframeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
        <div className="chart-telemetry">
          <span>24H VOL {formatCurrency(marketContext.dayNotionalVolume, true)}</span>
          <span>OI {formatCurrency(oiNotional, true)}</span>
          <span>{dataState === "live" ? "LIVE" : dataState === "loading" ? "SYNC" : "SEED"}</span>
        </div>
      </div>
      {isLoading ? (
        <div className="mission-chart chart-loading" aria-label="Loading SPCX chart">
          <span />
          <span />
          <span />
          <span />
          <b>Loading SPCX market data</b>
        </div>
      ) : (
        <div className="mission-chart" ref={chartContainerRef} />
      )}
    </div>
  );
}

export function HeroCommand({
  candles,
  dataState,
  latestClose,
  marketContext,
  timeframe,
  onTimeframeChange,
}: HeroCommandProps) {
  const [now, setNow] = useState(Date.now());
  const [selectedCandle, setSelectedCandle] = useState<SpcxCandle | null>(null);
  const countdown = useMemo(() => getCountdownParts(now), [now]);
  const activeClose = selectedCandle?.close ?? latestClose;
  const activeValuation = useMemo(() => calculateImpliedValuation(activeClose), [activeClose]);
  const activeTime = selectedCandle ? formatTimestamp(selectedCandle.time) : "Latest close";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero">
      <img className="hero-art" src={heroArtwork} alt="" />
      <div className="hero-vignette" />

      <div className="site-chrome">
        <span>PREIPO</span>
        <b>PREIPO.fyi</b>
      </div>
      <div className="preipo-explainer">
        <p>
          PREIPO tracks pre-listing companies through 24/7 cash-settled perpetual futures trading on Hyperliquid.
        </p>
      </div>

      <div className="hero-grid">
        <section className="instrument-deck angular">
          <div className="hero-head">
            <h1 className="deck-title">
              <span>SpaceX</span>
              <small>SPCX Pre-IPO Profile</small>
            </h1>
          </div>
          <div className="countdown-strip" tabIndex={0}>
            <span>Listing countdown</span>
            <strong>
              {String(countdown.days).padStart(2, "0")}D : {String(countdown.hours).padStart(2, "0")}H :{" "}
              {String(countdown.minutes).padStart(2, "0")}M : {String(countdown.seconds).padStart(2, "0")}S
            </strong>
            <p className="countdown-tooltip" role="tooltip">
              Reference date: June 12, 2026. This is not a confirmed IPO date; final listing timing may differ.
            </p>
          </div>
          <div className="market-primary">
            <div>
              <span>SPCX</span>
              <strong>{activeClose === null ? "--" : `$${activeClose.toFixed(2)}`}</strong>
              <small>{activeTime}</small>
            </div>
            <div className="valuation-card" tabIndex={0}>
              <span>Implied valuation</span>
              <strong>{formatValuation(activeValuation)}</strong>
              <small>{activeTime}</small>
              <p className="valuation-tooltip" role="tooltip">
                Uses the preliminary S-1 common share base: 6.932B Class A plus 5.603B Class B shares, or 12.535B
                shares before the offering. It excludes IPO shares, options, RSUs, and other dilution.
              </p>
            </div>
          </div>
          <MissionChart
            candles={candles}
            dataState={dataState}
            marketContext={marketContext}
            timeframe={timeframe}
            selected={selectedCandle}
            onSelect={setSelectedCandle}
            onTimeframeChange={onTimeframeChange}
          />
          <div className="source-credit">
            <span>PRICE FEED</span>
            <a href="https://hyperliquid.xyz/" target="_blank" rel="noreferrer" aria-label="Hyperliquid">
              <img src={hyperliquidWordmark} alt="Hyperliquid" />
            </a>
            <a href="https://trade.xyz/" target="_blank" rel="noreferrer">
              trade[XYZ]
            </a>
          </div>
        </section>
      </div>
    </section>
  );
}
