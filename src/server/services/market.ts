import { findDuplicateTransaction } from "@/domain/duplicates";
import { mapOldCarsAuction, type OldCarsAuctionRecord } from "@/domain/market-map";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { getJobQueue } from "../jobs/queue";
import { getLiveMarketProvider } from "../providers/market";

export async function ensureMarketProvider(slug: string, name: string, kind: string) {
  return prisma.marketProvider.upsert({
    where: { slug },
    create: { slug, name, kind, health: "UNCONFIGURED" },
    update: { name },
  });
}

export async function importNormalizedRecords(
  records: ReturnType<typeof mapOldCarsAuction>[],
  actorUserId: string | null,
  correlationId: string,
) {
  const provider = await ensureMarketProvider("old-cars-data", "Old Cars Data", "auction");
  const existing = await prisma.marketTransaction.findMany({
    select: {
      providerSlug: true,
      source: true,
      sourceRecordId: true,
      sourceUrl: true,
      vin: true,
      auctionEndAt: true,
      originalAmountMinor: true,
      currency: true,
    },
  });
  let imported = 0;
  let skipped = 0;
  for (const record of records) {
    const duplicate = findDuplicateTransaction(record, existing);
    if (duplicate.duplicate) {
      skipped += 1;
      continue;
    }
    await prisma.marketTransaction.create({
      data: {
        providerId: provider.id,
        providerSlug: record.providerSlug,
        source: record.source,
        sourceRecordId: record.sourceRecordId,
        sourceUrl: record.sourceUrl,
        retrievedAt: record.retrievedAt,
        auctionEndAt: record.auctionEndAt,
        saleLocation: record.saleLocation,
        currency: record.currency,
        originalAmountMinor: record.originalAmountMinor,
        normalizedUsdMinor: record.currency === "USD" ? record.originalAmountMinor : null,
        fxRate: record.currency === "USD" ? 1 : null,
        fxSource: record.currency === "USD" ? "identity" : null,
        fxDate: record.currency === "USD" ? record.retrievedAt : null,
        saleStatus: statusToEnum(record.saleStatus),
        reserveNotMet: record.reserveNotMet,
        year: record.year,
        make: record.make,
        model: record.model,
        bodyStyle: record.bodyStyle,
        engine: record.engine,
        transmission: record.transmission,
        drivetrain: record.drivetrain,
        mileage: record.mileage,
        mileageUnit: record.mileageUnit,
        modifications: record.modifications,
        knownDefects: record.knownDefects,
        vin: record.vin,
        imageUrl: record.imageUrl,
        imageLicensed: record.imageLicensed,
        rawPayload: record.rawPayload as object,
        rawChecksum: record.rawChecksum,
        licenseRestrictions:
          "Use is limited to authorized Old Cars Data access. Images are not treated as licensed for redistribution unless a license is recorded.",
      },
    });
    existing.push(record);
    imported += 1;
  }
  await prisma.marketProvider.update({
    where: { id: provider.id },
    data: { health: imported ? "HEALTHY" : provider.health, lastCheckedAt: new Date() },
  });
  await writeAudit({
    actorUserId,
    action: "market.imported",
    subjectType: "MarketProvider",
    subjectId: provider.id,
    newValue: { imported, skipped },
    source: "market.import",
    correlationId,
  });
  return { imported, skipped };
}

export async function importAuthorizedJson(
  payload: { data?: OldCarsAuctionRecord[] } | OldCarsAuctionRecord[],
  actorUserId: string | null,
  correlationId: string,
) {
  const records = Array.isArray(payload) ? payload : (payload.data ?? []);
  const queue = getJobQueue();
  const job = await queue.enqueue(
    "authorized-json-import",
    records.map((item) => item.id),
  );
  if (job.duplicate) {
    return { imported: 0, skipped: records.length, duplicateJob: true };
  }
  const normalized = records.map((item) => mapOldCarsAuction(item));
  const result = await importNormalizedRecords(normalized, actorUserId, correlationId);
  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "SUCCEEDED", finishedAt: new Date() },
  });
  return { ...result, duplicateJob: false };
}

export async function refreshFromLiveProvider(query: {
  make: string;
  model: string;
  yearMin?: number;
  yearMax?: number;
}) {
  const provider = getLiveMarketProvider();
  const result = await provider.searchCompleted({ ...query, status: "sold", limit: 40 });
  await ensureMarketProvider(provider.slug, provider.name, "auction");
  if (!result.ok) {
    await prisma.marketProvider.update({
      where: { slug: provider.slug },
      data: {
        health: provider.configured ? "UNAVAILABLE" : "UNCONFIGURED",
        lastError: result.reason,
        lastCheckedAt: new Date(),
      },
    });
    return { ok: false as const, reason: result.reason };
  }
  const imported = await importNormalizedRecords(result.records, null, `provider:${provider.slug}`);
  return { ok: true as const, ...imported, provider: provider.name };
}

function statusToEnum(status: string) {
  switch (status) {
    case "sold":
      return "SOLD" as const;
    case "reserve_not_met":
      return "RESERVE_NOT_MET" as const;
    case "live":
      return "LIVE" as const;
    case "asking":
      return "ASKING" as const;
    case "canceled":
      return "CANCELED" as const;
    case "withdrawn":
      return "WITHDRAWN" as const;
    default:
      return "RESULT_UNAVAILABLE" as const;
  }
}
