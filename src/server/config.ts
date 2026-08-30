function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function getConfig() {
  return {
    appName: process.env.APP_NAME ?? "MotorLedger",
    appEnv: process.env.APP_ENV ?? "development",
    demoMode: process.env.APP_DEMO_MODE === "true" || process.env.APP_ENV === "demonstration",
    baseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    databaseUrl: required(
      "DATABASE_URL",
      "postgresql://motorledger:motorledger_dev@localhost:5432/motorledger",
    ),
    sessionSecret: required("SESSION_SECRET", "dev-only-session-secret-change-me-32chars"),
    storage: {
      provider: process.env.STORAGE_PROVIDER ?? "local",
      localDir: process.env.STORAGE_LOCAL_DIR ?? "./storage",
      signedUrlTtl: Number(process.env.SIGNED_URL_TTL_SECONDS ?? 300),
      s3: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      },
    },
    email: {
      provider: process.env.EMAIL_PROVIDER ?? "console",
      from: process.env.EMAIL_FROM ?? "noreply@localhost",
    },
    market: {
      oldCarsData: {
        baseUrl: process.env.OLD_CARS_DATA_API_BASE_URL,
        apiKey: process.env.OLD_CARS_DATA_API_KEY,
      },
    },
    malware: {
      provider: process.env.MALWARE_SCAN_PROVIDER,
    },
    rateLimit: {
      authPerMinute: Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? 10),
      sharePerMinute: Number(process.env.SHARE_RATE_LIMIT_PER_MINUTE ?? 20),
    },
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 26_214_400),
  };
}

export function isProduction(): boolean {
  return getConfig().appEnv === "production";
}
