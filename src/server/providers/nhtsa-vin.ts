import { normalizeVin } from "@/domain/vin";

export interface DecodedVin {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  series: string | null;
  bodyStyle: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  doors: string | null;
  plant: string | null;
  errorText: string | null;
}

export interface VinDecodeSuccess {
  ok: true;
  decoded: DecodedVin;
  summary: string;
}

export interface VinDecodeFailure {
  ok: false;
  reason: string;
  unavailable?: boolean;
}

export function describeDecodedVin(decoded: DecodedVin): string {
  return [
    decoded.year,
    decoded.make,
    decoded.model,
    decoded.trim,
    decoded.engine,
    decoded.bodyStyle,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type VinDecodeResult = VinDecodeSuccess | VinDecodeFailure;

function titleCase(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
    .replace(/\b(Vw|Bmw|Gmc|Amg)\b/g, (token) => token.toUpperCase());
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== "0" ? trimmed : null;
}

function drivetrain(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper.includes("AWD") || upper.includes("ALL-WHEEL")) return "AWD";
  if (upper.includes("4WD") || upper.includes("4-WHEEL") || upper.includes("4X4")) return "4WD";
  if (upper.includes("FWD") || upper.includes("FRONT-WHEEL")) return "FWD";
  if (upper.includes("RWD") || upper.includes("REAR-WHEEL")) return "RWD";
  return value;
}

function engineLine(displacement: string | null, cylinders: string | null): string | null {
  const parts: string[] = [];
  if (displacement) {
    const liters = Number(displacement);
    parts.push(Number.isFinite(liters) ? `${liters.toFixed(liters >= 10 ? 0 : 1)}L` : `${displacement}L`);
  }
  if (cylinders) {
    const count = Number(cylinders);
    if (count >= 8) parts.push(`V${count}`);
    else if (count === 6) parts.push("V6");
    else if (count > 0) parts.push(`${count}-cylinder`);
  }
  return parts.length ? parts.join(" ") : null;
}

export function mapNhtsaResult(vin: string, row: Record<string, string | undefined>): DecodedVin {
  const year = Number(row.ModelYear);
  const body = [clean(row.BodyClass), clean(row.Doors) ? `${row.Doors}-door` : null]
    .filter(Boolean)
    .join(" · ");
  const plant = [titleCase(row.PlantCity), titleCase(row.PlantCountry)].filter(Boolean).join(", ");
  return {
    vin,
    year: Number.isFinite(year) && year >= 1885 ? year : null,
    make: titleCase(row.Make),
    model: clean(row.Model),
    trim: clean(row.Trim),
    series: clean(row.Series),
    bodyStyle: body || null,
    engine: engineLine(clean(row.DisplacementL), clean(row.EngineCylinders)),
    transmission: clean(row.TransmissionStyle),
    drivetrain: drivetrain(clean(row.DriveType)),
    doors: clean(row.Doors),
    plant: plant || null,
    errorText: clean(row.ErrorText),
  };
}

export async function decodeNhtsaVin(
  vin: string | null | undefined,
  fetchFn: typeof fetch = fetch,
): Promise<VinDecodeResult> {
  const normalized = normalizeVin(vin);
  if (!normalized) {
    return { ok: false, reason: "Enter a VIN to decode." };
  }
  if (normalized.length !== 17) {
    return {
      ok: false,
      reason:
        "NHTSA decode applies to 17-character VINs. Pre-1981 chassis numbers are stored as entered and are not decoded.",
    };
  }
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(normalized)}?format=json`;
  let payload: { Results?: Record<string, string>[] };
  try {
    const response = await fetchFn(url, { cache: "no-store" });
    if (!response.ok) {
      return {
        ok: false,
        unavailable: true,
        reason: `NHTSA VIN decode returned HTTP ${response.status}.`,
      };
    }
    payload = (await response.json()) as { Results?: Record<string, string>[] };
  } catch (error) {
    return {
      ok: false,
      unavailable: true,
      reason: error instanceof Error ? error.message : "NHTSA VIN decode failed.",
    };
  }
  const row = payload.Results?.[0];
  if (!row) return { ok: false, reason: "NHTSA returned no decode result." };
  const decoded = mapNhtsaResult(normalized, row);
  if (!decoded.year && !decoded.make && !decoded.model) {
    return {
      ok: false,
      reason: decoded.errorText || "NHTSA could not decode this VIN. No fields were invented.",
    };
  }
  const filled = [decoded.year, decoded.make, decoded.model, decoded.trim, decoded.engine].filter(
    Boolean,
  );
  return {
    ok: true,
    decoded,
    summary: `NHTSA vPIC decoded ${filled.length} identity fields. ${decoded.errorText ?? ""}`.trim(),
  };
}
