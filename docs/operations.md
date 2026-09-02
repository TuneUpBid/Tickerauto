# Setup and operations

## Prerequisites

- Node.js 22+
- PostgreSQL 16+
- Optional: Docker, S3-compatible storage, SMTP, Old Cars Data API credentials

## Local development

```bash
cp .env.example .env
# set DATABASE_URL, SESSION_SECRET, and APP_BASE_URL
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Demonstration accounts are created only when `APP_DEMO_MODE=true`. They exist so operators can walk the vertical workflow. They do not seed production valuations.

## Docker

```bash
docker compose up --build
```

## Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Production notes

- Terminate TLS in front of the Next.js process.
- Set `APP_ENV=production` and inject secrets from a manager.
- Use `STORAGE_PROVIDER=s3` with a private bucket.
- Configure email, malware scanning, and `OLD_CARS_DATA_API_KEY` (see `docs/data-provider-integration.md`) before treating the environment as lender-facing.
- Have appraisal and legal counsel replace draft certification language.
- Back up PostgreSQL and the object store. Audit events and signed reports must not be rewritten in place.
- Collection marks run once per calendar day in `MARKS_TIMEZONE` (default America/Los_Angeles) after midnight, while the Node server is running. If the process missed the midnight hour, it catches up the first time it is up later that day. Call `GET /api/cron/daily-marks` with `Authorization: Bearer $CRON_SECRET` if you use an external scheduler. Independently appraised values are snapshotted, not overwritten. Missing sold comps stay **Insufficient verified data**.

## Retention and privacy

`RetentionPolicy` stores workfile, document, and audit horizons. Account export and deletion are administrator-assisted in this release. Share links expire and can be revoked.
