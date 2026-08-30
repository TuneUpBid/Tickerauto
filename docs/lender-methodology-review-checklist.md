# Lender methodology review checklist

Use this checklist when a participating lender reviews MotorLedger. Approval is an explicit `LenderDecision` of `ACCEPTED`. Do not infer approval from silence, downloads, or portal visits.

## Process

1. Confirm the share is unexpired and unrevoked.
2. Confirm the report status is `ACTIVE` and the content hash matches the public verification page.
3. Confirm the signer is the assigned appraiser and that credentials are verified and unexpired.
4. Confirm intended use and intended users match the credit file.
5. Confirm the definition of value requested by credit policy (fair market, wholesale, orderly liquidation, or other). A fair-market estimate is not a liquidation value.
6. Confirm the methodology version id and that it is the version your institution agreed to review.
7. Review included comparables: source URL, sale date, sold status, adjustments, and weights.
8. Review excluded comparables and confirm reserve-not-met / asking / live items were not used as sold prices.
9. Confirm currency normalization has an FX source and date, or that all evidence is USD.
10. Confirm inspection type, date, and evidence checksum if your policy requires inspection.
11. Confirm title, lien, and insurance evidence are present or that gaps are disclosed.
12. Confirm appraisal age is within your configured maximum.
13. Record `ACCEPTED`, `REJECTED`, or `ADDITIONAL_EVIDENCE_REQUIRED` with a reason.

## Policy questions for counsel

- Which value definitions does the institution accept?
- What is the maximum appraisal age?
- Are desktop / remote inspections acceptable for the proposed LTV band?
- Who at the institution is authorized to record acceptance?
- What workfile retention is required?

MotorLedger does not determine collateral eligibility or loan-to-value.
