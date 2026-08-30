export interface TransactionIdentity {
  providerSlug: string;
  source: string;
  sourceRecordId: string;
  sourceUrl?: string | null;
  vin?: string | null;
  auctionEndAt?: Date | string | null;
  originalAmountMinor?: bigint | number | null;
  currency?: string | null;
}

export function transactionDedupeKey(tx: TransactionIdentity): string {
  return `${tx.providerSlug}::${tx.source}::${tx.sourceRecordId}`;
}

export function urlDedupeKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    return parsed.toString().toLowerCase().replace(/\/$/, "");
  } catch {
    return url.trim().toLowerCase();
  }
}

export function findDuplicateTransaction(
  candidate: TransactionIdentity,
  existing: TransactionIdentity[],
): { duplicate: boolean; reason?: string; match?: TransactionIdentity } {
  const candidateKey = transactionDedupeKey(candidate);
  const candidateUrl = urlDedupeKey(candidate.sourceUrl);
  const candidateVin = candidate.vin?.toUpperCase() ?? null;
  const candidateEnd = candidate.auctionEndAt
    ? new Date(candidate.auctionEndAt).toISOString().slice(0, 10)
    : null;

  for (const item of existing) {
    if (transactionDedupeKey(item) === candidateKey) {
      return {
        duplicate: true,
        reason: "Same provider, source, and source record identifier.",
        match: item,
      };
    }
    const itemUrl = urlDedupeKey(item.sourceUrl);
    if (candidateUrl && itemUrl && candidateUrl === itemUrl) {
      return {
        duplicate: true,
        reason: "Same source URL after normalization. Syndicated listings are not separate sales.",
        match: item,
      };
    }
    const itemVin = item.vin?.toUpperCase() ?? null;
    const itemEnd = item.auctionEndAt
      ? new Date(item.auctionEndAt).toISOString().slice(0, 10)
      : null;
    if (
      candidateVin &&
      itemVin &&
      candidateVin === itemVin &&
      candidateEnd &&
      itemEnd === candidateEnd
    ) {
      return {
        duplicate: true,
        reason: "Same VIN and sale date. Likely a syndicated or republished listing.",
        match: item,
      };
    }
  }
  return { duplicate: false };
}

export function uniqueTransactions<T extends TransactionIdentity>(items: T[]): T[] {
  const kept: T[] = [];
  for (const item of items) {
    if (!findDuplicateTransaction(item, kept).duplicate) {
      kept.push(item);
    }
  }
  return kept;
}
