type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
  if (bucket.timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.timestamps[0]);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterMs: 0 };
}

export function clientKey(prefix: string, ip: string | null | undefined): string {
  return `${prefix}:${ip ?? "unknown"}`;
}
