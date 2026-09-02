# Architecture and valuation methodology

Tickerauto is a Next.js application with a PostgreSQL database. Domain calculations live in `src/domain` and do not depend on the web framework. Server actions and services in `src/server` enforce authentication, tenancy, and audit. External vendors are hidden behind interfaces in `src/server/providers`.

## Request path

1. Collector authenticates with an HTTP-only session.
2. Vehicles and evidence are stored under a collection owned by an organization.
3. Market records are imported from an authorized provider or an administrator JSON import.
4. A draft valuation is developed by the comparable-sales methodology in `src/domain/comparables.ts`.
5. An appraiser may accept an assignment, record an inspection, and sign a report.
6. The collector may share the signed report with a lender. Lender acceptance is an explicit row in `LenderDecision`.

## What a number is allowed to be

| Label                         | When it is used                                                   |
| ----------------------------- | ----------------------------------------------------------------- |
| Source-backed market estimate | Draft or reviewed comparable-sales result                         |
| Draft valuation               | Any unsigned algorithmic result                                   |
| Independently appraised value | After a qualified appraiser signs                                 |
| Insufficient verified data    | Too few completed sales, missing FX, or missing subject evidence  |
| Stale                         | Last verified value preserved after provider failure or age limit |

The software never uses the phrases guaranteed, 100% accurate, bank approved, or USPAP certified.

A methodology becomes lender approved only after an authorized lender user records `ACCEPTED` on a share.

A California Vehicle Verifier license can stamp identity. It cannot sign value. The owner of a vehicle cannot independently appraise that vehicle. See `docs/credentials-and-lending.md`.

## Comparable-sales methodology `comps-v1.0.0`

Inputs: subject vehicle characteristics and stored market transactions.

1. Keep only completed sales (`sold`). Asking prices, live bids, and reserve-not-met results are retained as evidence and excluded with a written reason.
2. Require make and model match. Apply a configurable model-year window.
3. Score similarity for year, trim, body, engine, transmission, mileage, condition, and modifications.
4. Apply disclosed adjustments (mileage, project/non-running, engine swap, body style, transmission). Each adjustment stores a factor, amount, and justification.
5. Detect outliers with the interquartile range. Outliers are excluded with a reason and are never deleted.
6. Weight remaining sales by similarity, recency (half-life 540 days), and data completeness.
7. Reconcile with a weighted median. The supported range is the 25th–75th percentile of adjusted values.
8. If fewer than three included completed sales remain, return **Insufficient verified data**.

Liquidation, wholesale, retail, forced-sale, and insurance agreed values are separate methodology versions. The software does not derive them from an unexplained fixed discount of fair market value.

An LLM may not produce the final numeric value.

## Portfolio performance

- Unrealized and realized results are versus **cost basis** (acquisition + initial transaction costs + capital improvements).
- Gross appreciation versus purchase price is labeled as such and is not called profit.
- Net economic return subtracts operating expenses and selling fees.
- Charts use stored `ValueSnapshot` and `PortfolioSnapshot` rows. Missing days are gaps, not interpolated marks.
- Time-weighted return geometrically links snapshot sub-periods. Money-weighted return is the IRR of cash flows. Both explanations are shown in the UI.

## Report integrity

Finalized reports store an immutable JSON payload, SHA-256 content hash, public verification id, and optional QR/verification URL. Changing a signed report requires a new version that references the superseded id.
