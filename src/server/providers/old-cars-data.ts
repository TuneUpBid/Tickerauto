import {
  mapOldCarsAuction,
  type NormalizedMarketRecord,
  type OldCarsAuctionRecord,
} from "@/domain/market-map";

export const OLD_CARS_DATA_DEFAULT_BASE_URL = "https://api.oldcarsdata.com";

export interface MarketSearchQuery {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  status?: "sold" | "reserve not met" | "live";
  vin?: string;
  keyword?: string;
  source?: string;
  limit?: number;
  cursor?: string;
}

export interface MarketSearchSuccess {
  ok: true;
  records: NormalizedMarketRecord[];
  retrievedAt: Date;
  nextCursor?: string | null;
}

export interface MarketSearchFailure {
  ok: false;
  reason: string;
  httpStatus?: number;
  retryAfterSeconds?: number;
}

export type MarketSearchResult = MarketSearchSuccess | MarketSearchFailure;

export interface OldCarsDataClientOptions {
  baseUrl?: string;
  apiKey?: string | null;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinUrl(base: string, path: string): URL {
  return new URL(path.replace(/^\//, ""), base.endsWith("/") ? base : `${base}/`);
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: string; message?: string; detail?: string };
    return (
      json.error || json.message || json.detail || `Old Cars Data returned HTTP ${response.status}.`
    );
  } catch {
    return text.slice(0, 240) || `Old Cars Data returned HTTP ${response.status}.`;
  }
}

export class OldCarsDataHttpProvider {
  slug = "old-cars-data";
  name = "Old Cars Data";
  readonly baseUrl: string;
  private readonly apiKey: string | null;
  private readonly fetchFn: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetries: number;

  constructor(options: OldCarsDataClientOptions = {}) {
    this.baseUrl = options.baseUrl || OLD_CARS_DATA_DEFAULT_BASE_URL;
    this.apiKey = options.apiKey?.trim() || null;
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleep = options.sleep ?? sleepMs;
    this.maxRetries = options.maxRetries ?? 2;
  }

  get configured() {
    return Boolean(this.apiKey);
  }

  private authHeaders(): HeadersInit {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private applyQuery(url: URL, query: MarketSearchQuery) {
    if (query.make) url.searchParams.set("make", query.make);
    if (query.model) url.searchParams.set("model", query.model);
    if (query.yearMin) url.searchParams.set("year_min", String(query.yearMin));
    if (query.yearMax) url.searchParams.set("year_max", String(query.yearMax));
    if (query.vin) url.searchParams.set("vin", query.vin);
    if (query.keyword) url.searchParams.set("keyword", query.keyword);
    if (query.source) url.searchParams.set("source", query.source);
    if (query.cursor) {
      url.searchParams.set("pagination", "cursor");
      url.searchParams.set("cursor", query.cursor);
    }
    url.searchParams.set("limit", String(Math.min(query.limit ?? 20, 50)));
  }

  private async request(
    url: URL,
    authenticate: boolean,
  ): Promise<
    | { ok: true; payload: unknown }
    | { ok: false; reason: string; httpStatus: number; retryAfterSeconds?: number }
  > {
    if (authenticate && !this.apiKey) {
      return {
        ok: false,
        reason: "Old Cars Data API key is not configured. Set OLD_CARS_DATA_API_KEY.",
        httpStatus: 0,
      };
    }
    let attempt = 0;
    while (attempt <= this.maxRetries) {
      let response: Response;
      try {
        response = await this.fetchFn(url, {
          headers: this.authHeaders(),
          cache: "no-store",
        });
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : "Old Cars Data request failed",
          httpStatus: 0,
        };
      }
      if (response.status === 429 && attempt < this.maxRetries) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 1);
        const waitMs = Math.min(Math.max(retryAfter, 1), 30) * 1000;
        await this.sleep(waitMs);
        attempt += 1;
        continue;
      }
      if (!response.ok) {
        return {
          ok: false,
          reason: await readError(response),
          httpStatus: response.status,
          retryAfterSeconds:
            response.status === 429 ? Number(response.headers.get("Retry-After") ?? 1) : undefined,
        };
      }
      return { ok: true, payload: await response.json() };
    }
    return {
      ok: false,
      reason: "Old Cars Data rate limit persisted after bounded retries.",
      httpStatus: 429,
    };
  }

  async listMakes(): Promise<{ ok: true; makes: string[] } | { ok: false; reason: string }> {
    const url = joinUrl(this.baseUrl, "/makes");
    const result = await this.request(url, false);
    if (!result.ok) return { ok: false, reason: result.reason };
    const payload = result.payload as { data?: string[] };
    return { ok: true, makes: payload.data ?? [] };
  }

  async searchCompleted(query: MarketSearchQuery): Promise<MarketSearchResult> {
    const url = joinUrl(this.baseUrl, "/auctions");
    this.applyQuery(url, query);
    if (query.status && query.status !== "live") {
      url.searchParams.set("status", query.status);
    } else {
      url.searchParams.set("status", "sold");
    }
    return this.mapAuctionResponse(url, true);
  }

  async searchLive(query: MarketSearchQuery): Promise<MarketSearchResult> {
    const url = joinUrl(this.baseUrl, "/auctions/live");
    this.applyQuery(url, query);
    return this.mapAuctionResponse(url, true);
  }

  private async mapAuctionResponse(url: URL, authenticate: boolean): Promise<MarketSearchResult> {
    const retrievedAt = new Date();
    const result = await this.request(url, authenticate);
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason,
        httpStatus: result.httpStatus,
        retryAfterSeconds: result.retryAfterSeconds,
      };
    }
    const payload = result.payload as {
      data?: OldCarsAuctionRecord[];
      meta?: { next_cursor?: string | null };
    };
    const records = (payload.data ?? []).map((item) => mapOldCarsAuction(item, retrievedAt));
    return { ok: true, records, retrievedAt, nextCursor: payload.meta?.next_cursor ?? null };
  }

  async checkConnection(): Promise<{
    publicCatalog: boolean;
    authenticated: boolean;
    reason?: string;
    makeCount?: number;
  }> {
    const makes = await this.listMakes();
    if (!makes.ok) {
      return { publicCatalog: false, authenticated: false, reason: makes.reason };
    }
    if (!this.configured) {
      return {
        publicCatalog: true,
        authenticated: false,
        makeCount: makes.makes.length,
        reason: "API key is not set. Public /makes works; completed-sale search is unavailable.",
      };
    }
    const sample = await this.searchCompleted({
      make: "Porsche",
      model: "911",
      limit: 1,
      status: "sold",
    });
    if (!sample.ok) {
      return {
        publicCatalog: true,
        authenticated: false,
        makeCount: makes.makes.length,
        reason: sample.reason,
      };
    }
    return { publicCatalog: true, authenticated: true, makeCount: makes.makes.length };
  }
}
