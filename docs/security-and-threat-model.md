# Security and threat model

## Assets

- Account credentials and session tokens
- VINs, titles, storage locations, and ownership documents
- Acquisition prices, expenses, and lender reports
- Appraiser signatures and methodology configuration
- Audit history

## Controls in this release

- Registration, login, email verification, and password reset
- Passwords hashed with scrypt; session tokens stored as SHA-256
- HTTP-only, SameSite=Lax cookies; Secure in production
- Role and ownership checks on server actions
- Rate limits on authentication and sharing
- CSRF: cookie sessions plus Next.js server-action origin checks
- Upload allow-list (PDF/JPEG/PNG/WebP/HEIC) and 25 MB size limit
- Malware-scan interface; honest `not_configured` status when no vendor is connected
- Private object storage with expiring signed URLs
- Append-only audit events
- Signed reports rejected on silent mutation
- No secrets in the repository; `.env.example` contains names only
- MFA columns and settings copy are present; enrollment waits for an authenticator provider

## Threats and responses

| Threat                   | Response                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Credential stuffing      | Rate limits, lockout after failed attempts, password complexity  |
| Session theft            | HTTP-only cookies, hashed tokens, revocation on password reset   |
| Cross-tenant reads       | Collection ownership and membership checks                       |
| Forged valuations        | No invented prices; insufficient-data state; provenance on comps |
| Silent appraisal edits   | Content hash + signature; new version required                   |
| Inferred lender approval | LenderDecision is an explicit write by a lender role             |
| Malicious upload         | Type/size checks; scanner interface; private storage             |
| SSRF via provider URLs   | Providers called only with configured base URLs                  |
| XSS                      | React escaping; no raw HTML reports                              |
| Stolen share link        | Expiry, revocation, access log                                   |

## Residual risk

Production still requires TLS termination, a secret manager, an S3-compatible bucket, a real email provider, a malware scanner, and legal review of certification language. Administrators cannot silently alter signed appraisals; they can only create a superseding assignment.
