# Credentials and lending

Tickerauto can prepare most of a lending workfile. It cannot turn a dashboard mark into a certified loan figure.

## California Vehicle Verifier

A DMV Vehicle Verifier license is real and useful. It lets a person inspect a VIN and confirm the car is the car. On this platform that is an **identity stamp**.

It does **not**:

- certify fair market, wholesale, or liquidation value
- make a report USPAP compliant
- let the owner stamp their own collection as independently appraised
- satisfy a credit policy that asks for an appraisal

California does not issue a state “certified vehicle appraiser” license the way the Bureau of Real Estate Appraisers licenses real-estate appraisers. Calling a Vehicle Verifier license a certified appraisal credential is incorrect.

## How to become a vehicle value appraiser

Typical path used by specialty lenders and personal-property firms:

1. Complete the 15-hour National USPAP Course for **personal property** and keep the 7-hour update current.
2. Join and complete a designation that lenders recognize:
   - [American Society of Appraisers](https://www.appraisers.org/) — Personal Property, automotive specialty
   - [International Automotive Appraisers Association](https://iaaa.biz/)
   - [International Society of Appraisers](https://www.isa-appraisers.org/)
3. Log supervised experience, pass the body’s ethics and comprehensive requirements, and carry E&O insurance.
4. Add the designation under **Settings**. An administrator verifies it against the issuer before it can sign value.

## Using your own credentials

| Credential                         | On cars you own                         | On other people’s cars                          |
| ---------------------------------- | --------------------------------------- | ----------------------------------------------- |
| California Vehicle Verifier        | Identity only; labeled owner-performed  | Identity stamp                                  |
| USPAP education                    | Not a signing credential                | Not a signing credential                        |
| Verified ASA / IAAA / ISA + USPAP  | **Cannot sign** (independence)          | Can sign an independently appraised value       |

Lenders will reject an owner-appraised collateral opinion. Build the panel for other people’s cars; hire a disinterested appraiser for yours.

## What software can do (the “90%”)

Automated steps that do not invent value:

- VIN decode (NHTSA)
- completed-sale retrieval and comparable scoring
- gap list (title, inspection, independence, designation)
- draft report payload and lender share workflow

A person still has to inspect (as the engagement requires), judge the comps, and sign. An LLM is not allowed to author the final number. A lender still records `ACCEPTED` on the share.

See `docs/lender-methodology-review-checklist.md`.
