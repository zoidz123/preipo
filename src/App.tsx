import { useEffect, useMemo, useState } from "react";
import { HeroCommand } from "./components/HeroCommand";
import { ResearchSections } from "./components/ResearchSections";
import { SiteHeader, type AppView } from "./components/SiteHeader";
import { SpaceXPillars } from "./components/SpaceXPillars";
import { UpcomingIpos } from "./components/UpcomingIpos";
import { fallbackCompanies, fetchTopUsEquities, type RankedCompany } from "./lib/equities";
import {
  calculateImpliedValuation,
  fetchSpcxCandles,
  fetchSpcxMarketContext,
  getLatestClose,
  SPCX_TIMEFRAMES,
  seededCandles,
  seededMarketContext,
  type SpcxCandle,
  type SpcxMarketContext,
  type SpcxTimeframe,
} from "./lib/spcx";

type DataState = "loading" | "live" | "fallback";
const EMPTY_CANDLE_SERIES: Record<SpcxTimeframe, SpcxCandle[]> = {
  "1D": [],
  "1W": [],
  "1M": [],
};

const SPCX_CONTEXT_POLL_MS = 15_000;
const SPCX_CANDLES_POLL_MS = 60_000;

export default function App() {
  const [view, setView] = useState<AppView>("upcoming");
  const [candleSeries, setCandleSeries] = useState<Record<SpcxTimeframe, SpcxCandle[]>>(EMPTY_CANDLE_SERIES);
  const [timeframe, setTimeframe] = useState<SpcxTimeframe>("1W");
  const [marketContext, setMarketContext] = useState<SpcxMarketContext>({
    dayNotionalVolume: null,
    markPrice: null,
    openInterest: null,
  });
  const [topCompanies, setTopCompanies] = useState<RankedCompany[]>(fallbackCompanies);
  const [dataState, setDataState] = useState<DataState>("loading");

  useEffect(() => {
    let cancelled = false;

    const syncCandles = async () => {
      if (document.visibilityState === "hidden") return;

      try {
        const series = await Promise.all(SPCX_TIMEFRAMES.map(async (range) => [range, await fetchSpcxCandles(range)] as const));
        if (cancelled) return;

        setCandleSeries((current) => {
          const next = { ...current };
          series.forEach(([range, candles]) => {
            if (candles.length > 0) next[range] = candles;
          });
          return next;
        });
        setDataState("live");
      } catch {
        if (!cancelled) {
          setCandleSeries({ "1D": seededCandles, "1W": seededCandles, "1M": seededCandles });
          setDataState("fallback");
        }
      }
    };

    const syncMarketContext = async () => {
      if (document.visibilityState === "hidden") return;

      try {
        const context = await fetchSpcxMarketContext();
        if (!cancelled) {
          setMarketContext(context);
          setDataState((state) => (state === "fallback" ? state : "live"));
        }
      } catch {
        if (!cancelled) {
          setMarketContext(seededMarketContext);
          setDataState((state) => (state === "loading" ? "fallback" : state));
        }
      }
    };

    syncCandles();
    syncMarketContext();
    const candlesTimer = window.setInterval(syncCandles, SPCX_CANDLES_POLL_MS);
    const contextTimer = window.setInterval(syncMarketContext, SPCX_CONTEXT_POLL_MS);
    document.addEventListener("visibilitychange", syncCandles);
    document.addEventListener("visibilitychange", syncMarketContext);

    return () => {
      cancelled = true;
      window.clearInterval(candlesTimer);
      window.clearInterval(contextTimer);
      document.removeEventListener("visibilitychange", syncCandles);
      document.removeEventListener("visibilitychange", syncMarketContext);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncTopCompanies = () => {
      if (document.visibilityState === "hidden") return;

      fetchTopUsEquities()
        .then((companies) => {
          if (!cancelled && companies.length > 0) setTopCompanies(companies);
        })
        .catch(() => {
          if (!cancelled) setTopCompanies(fallbackCompanies);
        });
    };

    syncTopCompanies();
    const timer = window.setInterval(syncTopCompanies, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", syncTopCompanies);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncTopCompanies);
    };
  }, []);

  const candles = candleSeries[timeframe];
  const latestClose = useMemo(
    () => marketContext.markPrice ?? getLatestClose(candleSeries["1D"]) ?? getLatestClose(candles),
    [marketContext.markPrice, candleSeries, candles],
  );
  const impliedValuation = useMemo(() => calculateImpliedValuation(latestClose), [latestClose]);

  return (
    <main>
      <SiteHeader view={view} onViewChange={setView} />
      {view === "upcoming" ? (
        <UpcomingIpos />
      ) : (
        <>
          <HeroCommand
            candles={candles}
            dataState={dataState}
            latestClose={latestClose}
            marketContext={marketContext}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
          <SpaceXPillars />
          <ResearchSections companies={topCompanies} impliedValuation={impliedValuation} />
        </>
      )}
    </main>
  );
}
