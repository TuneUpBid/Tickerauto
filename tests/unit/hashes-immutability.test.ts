import { describe, expect, it } from "vitest";
import { contentHash, hashPassword, verifyPassword } from "@/domain/hashes";
import { staleIfOlderThan } from "@/domain/valuation";

describe("content hash and passwords", () => {
  it("is stable for key order", () => {
    expect(contentHash({ b: 1, a: 2 })).toBe(contentHash({ a: 2, b: 1 }));
  });
  it("changes when signed payload changes", () => {
    const original = contentHash({ value: 1, status: "ACTIVE" });
    const changed = contentHash({ value: 2, status: "ACTIVE" });
    expect(original).not.toBe(changed);
  });
  it("verifies hashed passwords", async () => {
    const stored = await hashPassword("CollectorDemo-2026!");
    expect(await verifyPassword("CollectorDemo-2026!", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });
});

describe("stale valuations", () => {
  it("marks values older than the configured age as stale", () => {
    expect(staleIfOlderThan(new Date("2025-01-01"), new Date("2026-08-01"), 180)).toBe(true);
    expect(staleIfOlderThan(new Date("2026-07-01"), new Date("2026-08-01"), 180)).toBe(false);
  });
});
