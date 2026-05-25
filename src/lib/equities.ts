export type FmpCompany = {
  symbol: string;
  companyName?: string;
  companyNameLong?: string;
  name?: string;
  marketCap: number;
};

export type RankedCompany = {
  symbol: string;
  name: string;
  marketCap: number;
  isSpaceX?: boolean;
};

export const fallbackCompanies: RankedCompany[] = [
  { symbol: "NVDA", name: "NVIDIA Corporation", marketCap: 5_220_000_000_000 },
  { symbol: "GOOGL", name: "Alphabet Inc.", marketCap: 4_630_000_000_000 },
  { symbol: "AAPL", name: "Apple Inc.", marketCap: 4_540_000_000_000 },
  { symbol: "MSFT", name: "Microsoft Corporation", marketCap: 3_110_000_000_000 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", marketCap: 2_860_000_000_000 },
  { symbol: "AVGO", name: "Broadcom Inc.", marketCap: 1_960_000_000_000 },
  { symbol: "TSLA", name: "Tesla, Inc.", marketCap: 1_600_000_000_000 },
  { symbol: "META", name: "Meta Platforms, Inc.", marketCap: 1_550_000_000_000 },
  { symbol: "BRK-B", name: "Berkshire Hathaway Inc.", marketCap: 1_050_000_000_000 },
  { symbol: "LLY", name: "Eli Lilly and Company", marketCap: 1_000_000_000_000 },
];

export function normalizeFmpCompanies(companies: FmpCompany[]): RankedCompany[] {
  const byName = new Map<string, RankedCompany>();

  companies
    .map((company) => ({
      symbol: company.symbol,
      name: company.companyName ?? company.companyNameLong ?? company.name ?? company.symbol,
      marketCap: Number(company.marketCap),
    }))
    .filter((company) => company.symbol && Number.isFinite(company.marketCap))
    .forEach((company) => {
      const key = company.name.toLowerCase();
      const existing = byName.get(key);
      if (!existing || company.marketCap > existing.marketCap) {
        byName.set(key, company);
      }
    });

  return [...byName.values()].sort((a, b) => b.marketCap - a.marketCap);
}

export function buildCompanyRanking(companies: RankedCompany[], impliedValuation: number | null): RankedCompany[] {
  const rows = [...companies];

  if (impliedValuation !== null && Number.isFinite(impliedValuation)) {
    rows.push({
      symbol: "SPCX",
      name: "SpaceX",
      marketCap: impliedValuation,
      isSpaceX: true,
    });
  }

  return rows.sort((a, b) => b.marketCap - a.marketCap);
}

export async function fetchTopUsEquities(): Promise<RankedCompany[]> {
  const response = await fetch("/api/top-us-equities");
  if (!response.ok) {
    throw new Error(`FMP ranking request failed: ${response.status}`);
  }
  const data = (await response.json()) as FmpCompany[];
  return normalizeFmpCompanies(data);
}
