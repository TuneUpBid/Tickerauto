import { createHash } from "node:crypto";
import { majorToMinor } from "./money";
import { canonicalizeSaleStatus, type CanonicalSaleStatus } from "./sale-status";

export interface OldCarsAuctionRecord {
  id: number | string;
  source: string;
  url?: string | null;
  title?: string | null;
  year?: number | null;
  ocd_make_name?: string | null;
  ocd_model_name?: string | null;
  listing_make?: string | null;
  listing_model?: string | null;
  vin?: string | null;
  auction_end_at?: string | null;
  auction_end_date?: string | null;
  auction_status?: string | null;
  currency?: string | null;
  price?: number | null;
  city?: string | null;
  state?: string | null;
  country_code?: string | null;
  mileage?: number | null;
  mileage_unit?: string | null;
  body_style?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  exterior_color?: string | null;
  interior_color?: string | null;
  modifications?: string[] | null;
  known_flaws?: string[] | null;
  featured_image_url?: string | null;
  has_reserve?: boolean | null;
  stats?: { bids?: number; unique_bidder_count?: number } | null;
}

export interface NormalizedMarketRecord {
  providerSlug: string;
  source: string;
  sourceRecordId: string;
  sourceUrl: string | null;
  retrievedAt: Date;
  auctionEndAt: Date | null;
  saleLocation: string | null;
  currency: string;
  originalAmountMinor: bigint | null;
  saleStatus: CanonicalSaleStatus;
  reserveNotMet: boolean;
  year: number | null;
  make: string | null;
  model: string | null;
  bodyStyle: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  mileage: number | null;
  mileageUnit: "MI" | "KM" | null;
  modifications: string[];
  knownDefects: string[];
  vin: string | null;
  imageUrl: string | null;
  imageLicensed: boolean;
  rawPayload: unknown;
  rawChecksum: string;
  title: string | null;
}

function checksum(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function mileageUnit(value: string | null | undefined): "MI" | "KM" | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "mi" || normalized === "miles") return "MI";
  if (normalized === "km" || normalized === "kilometers") return "KM";
  return null;
}

export function mapOldCarsAuction(
  record: OldCarsAuctionRecord,
  retrievedAt = new Date(),
): NormalizedMarketRecord {
  const status = canonicalizeSaleStatus(record.auction_status) ?? "result_unavailable";
  const location =
    [record.city, record.state, record.country_code].filter(Boolean).join(", ") || null;
  const amount =
    record.price === null || record.price === undefined
      ? null
      : majorToMinor(record.price, record.currency ?? "USD").amountMinor;

  return {
    providerSlug: "old-cars-data",
    source: record.source,
    sourceRecordId: String(record.id),
    sourceUrl: record.url ?? null,
    retrievedAt,
    auctionEndAt: record.auction_end_at
      ? new Date(record.auction_end_at.replace(" ", "T"))
      : record.auction_end_date
        ? new Date(record.auction_end_date)
        : null,
    saleLocation: location,
    currency: record.currency ?? "USD",
    originalAmountMinor: amount,
    saleStatus: status,
    reserveNotMet: status === "reserve_not_met",
    year: record.year ?? null,
    make: record.ocd_make_name ?? record.listing_make ?? null,
    model: record.ocd_model_name ?? record.listing_model ?? null,
    bodyStyle: record.body_style ?? null,
    engine: record.engine ?? null,
    transmission: record.transmission ?? null,
    drivetrain: record.drivetrain ?? null,
    mileage: record.mileage ?? null,
    mileageUnit: mileageUnit(record.mileage_unit),
    modifications: record.modifications ?? [],
    knownDefects: record.known_flaws ?? [],
    vin: record.vin ?? null,
    imageUrl: record.featured_image_url ?? null,
    imageLicensed: false,
    rawPayload: record,
    rawChecksum: checksum(record),
    title: record.title ?? null,
  };
}

export function isUsableCompletedSale(record: NormalizedMarketRecord): boolean {
  return record.saleStatus === "sold" && record.originalAmountMinor !== null;
}
