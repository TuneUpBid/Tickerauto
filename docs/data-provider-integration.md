# Data-provider integration guide

All vendors sit behind interfaces. If credentials are missing, the UI shows the last verified value or **Insufficient verified data**. Nothing is fabricated.

## Market data

Interface: `src/server/providers/market.ts`

| Provider                | Status in this release                                                         |
| ----------------------- | ------------------------------------------------------------------------------ |
| Old Cars Data HTTP      | Implemented; requires `OLD_CARS_DATA_API_BASE_URL` and `OLD_CARS_DATA_API_KEY` |
| Authorized JSON import  | Implemented for administrators                                                 |
| Black Book / J.D. Power | Interface and registry only                                                    |

Completed auction records are normalized to:

- provider, source, source record id, URL
- retrieval time, sale dates, location
- original amount and currency
- USD amount only when the currency is USD or a documented FX quote exists
- hammer vs buyer’s premium flags
- sale status, mileage, specifications, defects
- raw payload checksum and license notes

Rules:

- Do not scrape sites or violate terms of use.
- Do not treat asking prices, live bids, or reserve-not-met results as sold.
- Deduplicate by provider+source id, normalized URL, and VIN+sale date.

### Old Cars Data

When an HTTP API is configured, `OldCarsDataHttpProvider` requests completed auctions by make, model, and year. During this build, authorized Old Cars Data tools were used only to learn the record shape and to store a **test/demonstration fixture** of real completed and reserve-not-met listings. That fixture is not a production seed.

Import:

```bash
npx tsx scripts/import-authorized-market-json.ts tests/fixtures/old-cars-data-1973-911t.json
```

## Identity and history

Interface: `src/server/providers/verification.ts`

VIN check-digit validation (ISO 3779) is local and labeled as such. Title, lien, theft, salvage brand, odometer, and vehicle-history checks return `NOT_PERFORMED` until a provider is connected. The UI always shows provider, result, date, and source reference.

## Storage, email, malware, jobs

| Interface         | Default                                                   |
| ----------------- | --------------------------------------------------------- |
| `DocumentStorage` | Local disk; S3 adapter refuses to run without credentials |
| `EmailProvider`   | Console                                                   |
| `MalwareScanner`  | `not_configured`                                          |
| `JobQueue`        | Inline with payload-hash de-duplication                   |

## FX

Currency conversion requires a quote with source and date (`src/domain/currency.ts`). Different currencies are never treated as equal.
