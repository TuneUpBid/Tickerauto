# Data-provider integration guide

All vendors sit behind interfaces. If credentials are missing, the UI shows the last verified value or **Insufficient verified data**. Nothing is fabricated.

## Market data

Interface: `src/server/providers/market.ts`

| Provider                | Status in this release                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Old Cars Data HTTP      | Official REST client at `https://api.oldcarsdata.com`. Requires `OLD_CARS_DATA_API_KEY`. |
| Authorized JSON import  | Implemented for administrators                                                           |
| Black Book / J.D. Power | Interface and registry only                                                              |

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

Official docs: https://oldcarsdata.com/docs

| Item            | Value                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| Base URL        | `https://api.oldcarsdata.com` (override with `OLD_CARS_DATA_API_BASE_URL` only if directed) |
| Auth            | `Authorization: Bearer $OLD_CARS_DATA_API_KEY`                                              |
| Completed sales | `GET /auctions?status=sold`                                                                 |
| Live auctions   | `GET /auctions/live` (stored as live, never as sold)                                        |
| Public catalog  | `GET /makes`, `GET /models` (no key; does not count toward plan quota)                      |
| Burst limit     | HTTP 429 + `Retry-After`; the client retries with a bounded backoff                         |

Set the key in the environment or secret manager. Do not commit it.

```bash
OLD_CARS_DATA_API_BASE_URL=https://api.oldcarsdata.com
OLD_CARS_DATA_API_KEY=your-key
```

Administrators can test the connection and pull completed sales from **Admin**. Collectors can retrieve the same way from **Comparables**. Draft valuations call the live provider when the key is present; if the call fails, the last stored verified sales are preserved and marked stale.

A recorded fixture of real completed and reserve-not-met listings remains in `tests/fixtures` for automated tests only. That fixture is not a production seed.

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
