import { describe, expect, it, vi } from "vitest";
import { mapOldCarsAuction } from "@/domain/market-map";
import { OldCarsDataHttpProvider } from "@/server/providers/old-cars-data";

describe("Old Cars Data mapper", () => {
  it("accepts listing_make and listing_model from the official REST payload", () => {
    const mapped = mapOldCarsAuction({
      id: 123,
      source: "bringatrailer",
      listing_make: "Porsche",
      listing_model: "911",
      auction_status: "sold",
      currency: "USD",
      price: 82500,
      year: 1973,
    });
    expect(mapped.make).toBe("Porsche");
    expect(mapped.model).toBe("911");
    expect(mapped.saleStatus).toBe("sold");
  });
});

describe("Old Cars Data HTTP client", () => {
  it("refuses authenticated search without a key and does not invent records", async () => {
    const client = new OldCarsDataHttpProvider({ apiKey: null });
    const result = await client.searchCompleted({ make: "Porsche", model: "911" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/API key is not configured/);
    }
  });

  it("retries 429 once using Retry-After and then returns records", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("rate limited", { status: 429, headers: { "Retry-After": "1" } }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 1,
                source: "bringatrailer",
                listing_make: "Porsche",
                listing_model: "911",
                auction_status: "sold",
                currency: "USD",
                price: 1000,
                year: 1973,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new OldCarsDataHttpProvider({
      apiKey: "test-key",
      fetchFn: fetchFn as unknown as typeof fetch,
      sleep,
    });
    const result = await client.searchCompleted({ make: "Porsche", model: "911", limit: 1 });
    expect(sleep).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records).toHaveLength(1);
      expect(result.records[0].make).toBe("Porsche");
    }
  });

  it("maps live auctions as live, not sold", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 9,
              source: "bringatrailer",
              listing_make: "Porsche",
              listing_model: "911",
              auction_status: "active",
              currency: "USD",
              price: 50000,
              year: 1973,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new OldCarsDataHttpProvider({
      apiKey: "test-key",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const result = await client.searchLive({ make: "Porsche", model: "911" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records[0].saleStatus).toBe("live");
    }
  });
});
