import { describe, expect, it, vi } from "vitest";
import { decodeNhtsaVin, mapNhtsaResult } from "@/server/providers/nhtsa-vin";

const gt500Row = {
  ModelYear: "2021",
  Make: "FORD",
  Model: "Mustang",
  Trim: "Shelby GT500 Coupe",
  Series: "",
  BodyClass: "Coupe",
  Doors: "2",
  DisplacementL: "5.2",
  EngineCylinders: "8",
  TransmissionStyle: "Manual",
  DriveType: "RWD/Rear-Wheel Drive",
  PlantCity: "FLAT ROCK",
  PlantCountry: "UNITED STATES (USA)",
  ErrorText: "0 - VIN decoded clean. Check Digit (9th position) is valid",
};

describe("NHTSA VIN mapper", () => {
  it("maps year, make, trim, engine, and drivetrain without inventing missing fields", () => {
    const decoded = mapNhtsaResult("1FA6P8SJ1M5504176", gt500Row);
    expect(decoded.year).toBe(2021);
    expect(decoded.make).toBe("Ford");
    expect(decoded.model).toBe("Mustang");
    expect(decoded.trim).toBe("Shelby GT500 Coupe");
    expect(decoded.engine).toBe("5.2L V8");
    expect(decoded.drivetrain).toBe("RWD");
    expect(decoded.bodyStyle).toContain("Coupe");
    expect(decoded.series).toBeNull();
  });
});

describe("NHTSA VIN decode client", () => {
  it("does not call the API for pre-1981 chassis numbers", async () => {
    const fetchFn = vi.fn();
    const result = await decodeNhtsaVin("9113102305", fetchFn as unknown as typeof fetch);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/17-character/);
    }
  });

  it("returns decoded fields from a vPIC payload", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Results: [gt500Row] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await decodeNhtsaVin("1FA6P8SJ1M5504176", fetchFn as unknown as typeof fetch);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.decoded.make).toBe("Ford");
      expect(result.decoded.trim).toBe("Shelby GT500 Coupe");
    }
  });

  it("does not invent identity when NHTSA returns an empty result", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Results: [{ ModelYear: "", Make: "", Model: "", ErrorText: "11 - Incorrect VIN" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const result = await decodeNhtsaVin("11111111111111111", fetchFn as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/Incorrect VIN|could not decode/i);
    }
  });
});
