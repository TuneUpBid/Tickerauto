# Tickerauto

Collector-car portfolio tracking, source-backed market estimates, independent appraisal workflow, and lender-facing collateral reporting.

## What this release does

A collector can register, create a private collection, add a real vehicle, upload evidence, enter acquisition and expense amounts, import or retrieve authorized market transactions, review source-linked comparables, generate a transparent draft valuation, track snapshots and P&L, submit the file for appraiser review, produce a versioned report, share it with a lender, and verify the report hash on a public page.

If verified evidence is missing, the product shows **Insufficient verified data**. It does not invent prices.

## Quick start

```bash
cp .env.example .env
# DATABASE_URL=postgresql://motorledger:motorledger_dev@localhost:5432/motorledger
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

See `docs/operations.md` for Docker, checks, and production notes.

## Documentation

- `docs/architecture-and-valuation-methodology.md`
- `docs/security-and-threat-model.md`
- `docs/data-provider-integration.md`
- `docs/lender-methodology-review-checklist.md`
- `docs/operations.md`

## Credentials still required for production

- PostgreSQL
- Session secret
- SMTP or another email provider
- S3-compatible private bucket
- Old Cars Data (or another licensed market feed) API credentials
- Title / history / theft providers if those checks must be performed
- Malware scanning vendor
- Legal and appraisal review of certification language

Demonstration accounts are created only when `APP_DEMO_MODE=true` and are not production data.
