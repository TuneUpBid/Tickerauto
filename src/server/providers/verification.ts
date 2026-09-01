import { decodeNhtsaVin } from "./nhtsa-vin";

export interface IdentityCheckRequest {
  type:
    | "VIN_DECODE"
    | "TITLE"
    | "LIEN"
    | "THEFT"
    | "SALVAGE_BRAND"
    | "ODOMETER_HISTORY"
    | "VEHICLE_HISTORY";
  vin?: string | null;
  year?: number;
  make?: string;
  model?: string;
}

export interface IdentityCheckResult {
  type: IdentityCheckRequest["type"];
  provider: string;
  outcome: "NOT_PERFORMED" | "PROVIDER_UNAVAILABLE" | "PASSED" | "FAILED" | "INCONCLUSIVE";
  performedAt: Date | null;
  sourceReference: string | null;
  summary: string;
}

export class NhtsaVinDecodeProvider implements IdentityVerificationProvider {
  configured = true;
  async run(request: IdentityCheckRequest): Promise<IdentityCheckResult> {
    const result = await decodeNhtsaVin(request.vin);
    if (!result.ok) {
      return {
        type: "VIN_DECODE",
        provider: "NHTSA vPIC",
        outcome: result.unavailable ? "PROVIDER_UNAVAILABLE" : "INCONCLUSIVE",
        performedAt: new Date(),
        sourceReference: "https://vpic.nhtsa.dot.gov",
        summary: result.reason,
      };
    }
    const consistencyIssues: string[] = [];
    if (request.year && result.decoded.year && request.year !== result.decoded.year) {
      consistencyIssues.push(`stated year ${request.year} vs decoded ${result.decoded.year}`);
    }
    if (
      request.make &&
      result.decoded.make &&
      request.make.toLowerCase() !== result.decoded.make.toLowerCase()
    ) {
      consistencyIssues.push(`stated make ${request.make} vs decoded ${result.decoded.make}`);
    }
    return {
      type: "VIN_DECODE",
      provider: "NHTSA vPIC",
      outcome: consistencyIssues.length ? "INCONCLUSIVE" : "PASSED",
      performedAt: new Date(),
      sourceReference: "https://vpic.nhtsa.dot.gov",
      summary: consistencyIssues.length
        ? `${result.summary} ${consistencyIssues.join("; ")}`
        : result.summary,
    };
  }
}

export interface IdentityVerificationProvider {
  configured: boolean;
  run(request: IdentityCheckRequest): Promise<IdentityCheckResult>;
}

export class UnconfiguredIdentityProvider implements IdentityVerificationProvider {
  configured = false;
  constructor(private readonly name: string) {}
  async run(request: IdentityCheckRequest): Promise<IdentityCheckResult> {
    return {
      type: request.type,
      provider: this.name,
      outcome: "NOT_PERFORMED",
      performedAt: null,
      sourceReference: null,
      summary: `${this.name} is not connected. This check was not performed and no result was invented.`,
    };
  }
}

export function getIdentityProvider(
  type: IdentityCheckRequest["type"],
): IdentityVerificationProvider {
  if (type === "VIN_DECODE") {
    return new NhtsaVinDecodeProvider();
  }
  const names: Record<IdentityCheckRequest["type"], string> = {
    VIN_DECODE: "NHTSA vPIC",
    TITLE: process.env.TITLE_PROVIDER || "Title provider",
    LIEN: process.env.TITLE_PROVIDER || "Lien provider",
    THEFT: process.env.THEFT_PROVIDER || "Theft-check provider",
    SALVAGE_BRAND: process.env.NMVTIS_PROVIDER || "Brand-history provider",
    ODOMETER_HISTORY: process.env.VEHICLE_HISTORY_PROVIDER || "Odometer-history provider",
    VEHICLE_HISTORY: process.env.VEHICLE_HISTORY_PROVIDER || "Vehicle-history provider",
  };
  return new UnconfiguredIdentityProvider(names[type]);
}
