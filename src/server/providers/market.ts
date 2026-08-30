import {
  mapOldCarsAuction,
  type NormalizedMarketRecord,
  type OldCarsAuctionRecord,
} from "@/domain/market-map";
import { getConfig } from "../config";

export interface MarketSearchQuery {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  status?: "sold" | "reserve not met" | "live";
  limit?: number;
}

export interface MarketDataProvider {
  slug: string;
  name: string;
  configured: boolean;
  searchCompleted(
    query: MarketSearchQuery,
  ): Promise<
    | { ok: true; records: NormalizedMarketRecord[]; retrievedAt: Date }
    | { ok: false; reason: string }
  >;
}

export class UnconfiguredMarketProvider implements MarketDataProvider {
  constructor(
    public slug: string,
    public name: string,
  ) {}
  configured = false;
  async searchCompleted(): Promise<{ ok: false; reason: string }> {
    return {
      ok: false,
      reason: `${this.name} is not connected. No market records were retrieved and no values were invented.`,
    };
  }
}

export class OldCarsDataHttpProvider implements MarketDataProvider {
  slug = "old-cars-data";
  name = "Old Cars Data";
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}
  get configured() {
    return Boolean(this.baseUrl && this.apiKey);
  }
  async searchCompleted(query: MarketSearchQuery) {
    if (!this.configured) {
      return {
        ok: false as const,
        reason: "Old Cars Data API credentials are not configured.",
      };
    }
    const url = new URL("/auctions", this.baseUrl);
    if (query.make) url.searchParams.set("make", query.make);
    if (query.model) url.searchParams.set("model", query.model);
    if (query.yearMin) url.searchParams.set("year_min", String(query.yearMin));
    if (query.yearMax) url.searchParams.set("year_max", String(query.yearMax));
    url.searchParams.set("status", query.status ?? "sold");
    url.searchParams.set("limit", String(query.limit ?? 20));
    const retrievedAt = new Date();
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!response.ok) {
        return { ok: false as const, reason: `Old Cars Data returned HTTP ${response.status}.` };
      }
      const payload = (await response.json()) as { data?: OldCarsAuctionRecord[] };
      const records = (payload.data ?? []).map((item) => mapOldCarsAuction(item, retrievedAt));
      return { ok: true as const, records, retrievedAt };
    } catch (error) {
      return {
        ok: false as const,
        reason: error instanceof Error ? error.message : "Old Cars Data request failed",
      };
    }
  }
}

export class AuthorizedJsonImportProvider implements MarketDataProvider {
  slug = "authorized-json-import";
  name = "Authorized JSON import";
  configured = true;
  constructor(private readonly records: OldCarsAuctionRecord[]) {}
  async searchCompleted(query: MarketSearchQuery) {
    const retrievedAt = new Date();
    const records = this.records
      .map((item) => mapOldCarsAuction(item, retrievedAt))
      .filter((item) => {
        if (query.make && item.make?.toLowerCase() !== query.make.toLowerCase()) return false;
        if (query.model && item.model?.toLowerCase() !== query.model.toLowerCase()) return false;
        if (query.yearMin && (item.year ?? 0) < query.yearMin) return false;
        if (query.yearMax && (item.year ?? 9999) > query.yearMax) return false;
        return true;
      });
    return { ok: true as const, records, retrievedAt };
  }
}

export function getLiveMarketProvider(): MarketDataProvider {
  const config = getConfig();
  if (config.market.oldCarsData.baseUrl && config.market.oldCarsData.apiKey) {
    return new OldCarsDataHttpProvider(
      config.market.oldCarsData.baseUrl,
      config.market.oldCarsData.apiKey,
    );
  }
  return new UnconfiguredMarketProvider("old-cars-data", "Old Cars Data");
}
