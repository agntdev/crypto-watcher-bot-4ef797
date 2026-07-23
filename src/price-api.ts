/**
 * Crypto price API integration using CoinGecko (free tier, no API key required).
 * Handles retries, rate limits, and error responses.
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const TICKER_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ALGO: "algorand",
};

const NAME_MAP: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
  ripple: "XRP",
  dogecoin: "Dogecoin",
  cardano: "Cardano",
  polkadot: "Polkadot",
  "avalanche-2": "Avalanche",
  "matic-network": "Polygon",
  chainlink: "Chainlink",
  uniswap: "Uniswap",
  "shiba-inu": "Shiba Inu",
  litecoin: "Litecoin",
  "bitcoin-cash": "Bitcoin Cash",
  algorand: "Algorand",
};

export interface PriceResult {
  ticker: string;
  coinId: string;
  displayName: string;
  priceUsd: number;
  priceChange24h: number;
  percentChange24h: number;
}

export interface CoinSearchResult {
  ticker: string;
  coinId: string;
  displayName: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited - wait and retry
        await sleep(delay * (i + 1));
        continue;
      }
      return response;
    } catch {
      if (i === retries - 1) throw new Error("Network error - please try again");
      await sleep(delay * (i + 1));
    }
  }
  throw new Error("Failed to fetch data");
}

export async function getPrice(ticker: string): Promise<PriceResult | null> {
  const coinId = TICKER_MAP[ticker.toUpperCase()];
  if (!coinId) {
    // Try to search for the ticker
    const searchResult = await searchCoin(ticker);
    if (searchResult.length === 0) return null;
    const best = searchResult[0];
    return getPriceById(best.coinId, best.ticker, best.displayName);
  }
  return getPriceById(coinId, ticker.toUpperCase(), NAME_MAP[coinId] ?? ticker.toUpperCase());
}

async function getPriceById(coinId: string, ticker: string, displayName: string): Promise<PriceResult | null> {
  try {
    const url = `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    const data = await response.json();
    const coinData = data[coinId];
    if (!coinData) return null;
    return {
      ticker,
      coinId,
      displayName,
      priceUsd: coinData.usd,
      priceChange24h: coinData.usd_24h_change ?? 0,
      percentChange24h: coinData.usd_24h_change ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getPrices(tickers: string[]): Promise<PriceResult[]> {
  const coinIds = tickers
    .map((t) => TICKER_MAP[t.toUpperCase()])
    .filter(Boolean)
    .join(",");
  if (!coinIds) return [];

  try {
    const url = `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    const results: PriceResult[] = [];
    for (const [coinId, coinData] of Object.entries(data)) {
      const d = coinData as { usd: number; usd_24h_change?: number };
      const ticker = Object.entries(TICKER_MAP).find(([, id]) => id === coinId)?.[0] ?? coinId;
      results.push({
        ticker,
        coinId,
        displayName: NAME_MAP[coinId] ?? ticker,
        priceUsd: d.usd,
        priceChange24h: d.usd_24h_change ?? 0,
        percentChange24h: d.usd_24h_change ?? 0,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function searchCoin(query: string): Promise<CoinSearchResult[]> {
  try {
    const url = `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`;
    const response = await fetchWithRetry(url);
    if (!response.ok) return [];
    const data = await response.json();
    const coins = data.coins ?? [];
    return coins.slice(0, 5).map((c: { symbol: string; id: string; name: string }) => ({
      ticker: c.symbol.toUpperCase(),
      coinId: c.id,
      displayName: c.name,
    }));
  } catch {
    return [];
  }
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  return price.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 6 });
}

export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}
