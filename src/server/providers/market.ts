import type { OldCarsAuctionRecord } from "@/domain/market-map";
import { mapOldCarsAuction } from "@/domain/market-map";
import { getConfig } from "../config";
import {
  OldCarsDataHttpProvider,
  type MarketSearchQuery,
  type MarketSearchResult,
} from "./old-cars-data";

export type { MarketSearchQuery, MarketSearchResult };

export interface MarketDataProvider {
  slug: string;
  name: string;
  configured: boolean;
  searchCompleted(query: MarketSearchQuery): Promise<MarketSearchResult>;
}

export class UnconfiguredMarketProvider implements MarketDataProvider {
  constructor(
    public slug: string,
    public name: string,
  ) {}
  configured = false;
  async searchCompleted(): Promise<MarketSearchResult> {
    return {
      ok: false,
      reason: `${this.name} is not connected. No market records were retrieved and no values were invented.`,
    };
  }
}

export class AuthorizedJsonImportProvider implements MarketDataProvider {
  slug = "authorized-json-import";
  name = "Authorized JSON import";
  configured = true;
  constructor(private readonly records: OldCarsAuctionRecord[]) {}
  async searchCompleted(query: MarketSearchQuery): Promise<MarketSearchResult> {
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
    return { ok: true, records, retrievedAt };
  }
}

export function getOldCarsDataClient(): OldCarsDataHttpProvider {
  const config = getConfig();
  return new OldCarsDataHttpProvider({
    baseUrl: config.market.oldCarsData.baseUrl,
    apiKey: config.market.oldCarsData.apiKey,
  });
}

export function getLiveMarketProvider(): MarketDataProvider {
  const client = getOldCarsDataClient();
  if (client.configured) return client;
  return new UnconfiguredMarketProvider("old-cars-data", "Old Cars Data");
}
