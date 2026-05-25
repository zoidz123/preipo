import { describe, expect, it } from "vitest";
import { buildCompanyRanking, normalizeFmpCompanies } from "./equities";

describe("equity ranking helpers", () => {
  it("normalizes FMP screener companies by market cap descending", () => {
    const companies = normalizeFmpCompanies([
      { symbol: "MSFT", companyName: "Microsoft Corporation", marketCap: 3_110_000_000_000 },
      { symbol: "NVDA", companyName: "NVIDIA Corporation", marketCap: 5_220_000_000_000 },
    ]);

    expect(companies.map((company) => company.symbol)).toEqual(["NVDA", "MSFT"]);
  });

  it("deduplicates multiple share classes by company name", () => {
    const companies = normalizeFmpCompanies([
      { symbol: "GOOG", companyName: "Alphabet Inc.", marketCap: 4_590_000_000_000 },
      { symbol: "GOOGL", companyName: "Alphabet Inc.", marketCap: 4_630_000_000_000 },
      { symbol: "BRK-A", companyName: "Berkshire Hathaway Inc.", marketCap: 1_040_000_000_000 },
      { symbol: "BRK-B", companyName: "Berkshire Hathaway Inc.", marketCap: 1_050_000_000_000 },
    ]);

    expect(companies).toEqual([
      { symbol: "GOOGL", name: "Alphabet Inc.", marketCap: 4_630_000_000_000 },
      { symbol: "BRK-B", name: "Berkshire Hathaway Inc.", marketCap: 1_050_000_000_000 },
    ]);
  });

  it("inserts SpaceX implied valuation into the public company ranking", () => {
    const ranking = buildCompanyRanking(
      [
        { symbol: "NVDA", name: "NVIDIA Corporation", marketCap: 5_220_000_000_000 },
        { symbol: "GOOGL", name: "Alphabet Inc.", marketCap: 4_630_000_000_000 },
        { symbol: "MSFT", name: "Microsoft Corporation", marketCap: 3_110_000_000_000 },
        { symbol: "AMZN", name: "Amazon.com, Inc.", marketCap: 2_860_000_000_000 },
      ],
      2_600_000_000_000,
    );

    expect(ranking.map((row) => row.symbol)).toEqual(["NVDA", "GOOGL", "MSFT", "AMZN", "SPCX"]);
    expect(ranking.at(-1)?.isSpaceX).toBe(true);
  });

  it("places SpaceX above smaller public companies", () => {
    const ranking = buildCompanyRanking(
      [
        { symbol: "NVDA", name: "NVIDIA Corporation", marketCap: 5_220_000_000_000 },
        { symbol: "AMZN", name: "Amazon.com, Inc.", marketCap: 2_860_000_000_000 },
        { symbol: "AVGO", name: "Broadcom Inc.", marketCap: 1_960_000_000_000 },
      ],
      2_600_000_000_000,
    );

    expect(ranking.map((row) => row.symbol)).toEqual(["NVDA", "AMZN", "SPCX", "AVGO"]);
  });
});
