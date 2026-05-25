const FMP_COMPANY_SCREENER_URL = "https://financialmodelingprep.com/stable/company-screener";

function parseArgs(argv) {
  const args = {
    limit: 10,
    marketCapMoreThan: 500_000_000_000,
    country: "US",
    resultLimit: 100,
  };

  for (const arg of argv) {
    const [key, value] = arg.split("=");
    if (key === "--limit" && value) args.limit = Number(value);
    if (key === "--market-cap-more-than" && value) args.marketCapMoreThan = Number(value);
    if (key === "--country" && value) args.country = value.toUpperCase();
    if (key === "--result-limit" && value) args.resultLimit = Number(value);
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error("--limit must be a positive integer");
  }

  if (!Number.isFinite(args.marketCapMoreThan) || args.marketCapMoreThan < 0) {
    throw new Error("--market-cap-more-than must be a non-negative number");
  }

  if (!Number.isInteger(args.resultLimit) || args.resultLimit < args.limit) {
    throw new Error("--result-limit must be an integer greater than or equal to --limit");
  }

  return args;
}

async function fetchLargestEquities(apikey, args) {
  const url = new URL(FMP_COMPANY_SCREENER_URL);
  url.searchParams.set("apikey", apikey);
  url.searchParams.set("country", args.country);
  url.searchParams.set("marketCapMoreThan", String(args.marketCapMoreThan));
  url.searchParams.set("isEtf", "false");
  url.searchParams.set("isFund", "false");
  url.searchParams.set("isActivelyTrading", "true");
  url.searchParams.set("limit", String(args.resultLimit));

  const response = await fetch(url);
  const json = await response.json();

  if (!response.ok) {
    throw new Error(`FMP request failed (${response.status}): ${JSON.stringify(json)}`);
  }

  if (!Array.isArray(json)) {
    throw new Error(`Unexpected FMP response: ${JSON.stringify(json)}`);
  }

  return json
    .filter((item) => item.marketCap && !item.isEtf && !item.isFund)
    .sort((a, b) => b.marketCap - a.marketCap);
}

function dedupeShareClasses(rows) {
  const byCompany = new Map();

  for (const row of rows) {
    const key = row.companyName ?? row.symbol;
    const existing = byCompany.get(key);
    if (!existing || row.marketCap > existing.marketCap) {
      byCompany.set(key, row);
    }
  }

  return [...byCompany.values()];
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function printTable(rows) {
  console.table(
    rows.map((row, index) => ({
      rank: index + 1,
      symbol: row.symbol,
      company: row.companyName,
      marketCap: formatUsd(row.marketCap),
      price: row.price,
      exchange: row.exchangeShortName,
    })),
  );
}

async function main() {
  const apikey = process.env.FMP_API_KEY;
  if (!apikey) {
    throw new Error("Set FMP_API_KEY before running this script.");
  }

  const args = parseArgs(process.argv.slice(2));
  const rows = await fetchLargestEquities(apikey, args);
  const top = dedupeShareClasses(rows).slice(0, args.limit);

  printTable(top);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
