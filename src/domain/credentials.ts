export type CredentialAuthority = "IDENTITY" | "VALUE" | "EDUCATION_ONLY";

export interface CredentialCatalogEntry {
  type: string;
  label: string;
  authority: CredentialAuthority;
  issuer: string;
  canStampIdentity: boolean;
  canSignValue: boolean;
  summary: string;
}

export const CREDENTIAL_CATALOG: Record<string, CredentialCatalogEntry> = {
  CA_VEHICLE_VERIFIER: {
    type: "CA_VEHICLE_VERIFIER",
    label: "California DMV Vehicle Verifier",
    authority: "IDENTITY",
    issuer: "California Department of Motor Vehicles",
    canStampIdentity: true,
    canSignValue: false,
    summary:
      "Authorizes VIN and vehicle-identity verification for DMV work. It is not a market-value appraisal credential and cannot certify a figure for a loan or net-worth statement.",
  },
  USPAP_PERSONAL_PROPERTY: {
    type: "USPAP_PERSONAL_PROPERTY",
    label: "USPAP personal-property education",
    authority: "EDUCATION_ONLY",
    issuer: "The Appraisal Foundation / approved sponsors",
    canStampIdentity: false,
    canSignValue: false,
    summary:
      "Required coursework (15-hour personal-property USPAP plus the current 7-hour update). Education alone is not a license or a designation.",
  },
  ASA_PERSONAL_PROPERTY: {
    type: "ASA_PERSONAL_PROPERTY",
    label: "ASA personal property (automotive)",
    authority: "VALUE",
    issuer: "American Society of Appraisers",
    canStampIdentity: false,
    canSignValue: true,
    summary:
      "Private designation used for personal-property value opinions. With current USPAP and a verified record, this can support a signed independently appraised value.",
  },
  IAAA: {
    type: "IAAA",
    label: "IAAA automotive appraiser",
    authority: "VALUE",
    issuer: "International Automotive Appraisers Association",
    canStampIdentity: false,
    canSignValue: true,
    summary:
      "Private automotive-appraisal membership/designation. With current USPAP and a verified record, this can support a signed independently appraised value.",
  },
  ISA: {
    type: "ISA",
    label: "ISA personal property",
    authority: "VALUE",
    issuer: "International Society of Appraisers",
    canStampIdentity: false,
    canSignValue: true,
    summary:
      "Private personal-property designation. With current USPAP and a verified record, this can support a signed independently appraised value.",
  },
  OTHER_VALUE_DESIGNATION: {
    type: "OTHER_VALUE_DESIGNATION",
    label: "Other value designation",
    authority: "VALUE",
    issuer: "Named credentialing body",
    canStampIdentity: false,
    canSignValue: true,
    summary:
      "Use only for a named personal-property or automotive appraisal designation. An administrator must verify the issuer before a value signature is allowed.",
  },
};

export const CREDENTIAL_TYPE_OPTIONS = Object.values(CREDENTIAL_CATALOG);

export function catalogEntry(type: string): CredentialCatalogEntry {
  return (
    CREDENTIAL_CATALOG[type] ?? {
      type,
      label: type,
      authority: "EDUCATION_ONLY",
      issuer: "Unknown",
      canStampIdentity: false,
      canSignValue: false,
      summary: "Unrecognized credential type. It cannot stamp identity or sign value.",
    }
  );
}

export interface CredentialRecord {
  credentialType: string;
  authority?: CredentialAuthority | string | null;
  verificationStatus: string;
  expiresOn?: Date | string | null;
  uspapEducationCurrent?: boolean;
}

export function effectiveAuthority(record: CredentialRecord): CredentialAuthority {
  const catalog = catalogEntry(record.credentialType);
  if (record.authority === "IDENTITY" || record.authority === "VALUE" || record.authority === "EDUCATION_ONLY") {
    return record.authority;
  }
  return catalog.authority;
}

function isExpired(expiresOn: Date | string | null | undefined, asOf: Date): boolean {
  if (!expiresOn) return false;
  return new Date(expiresOn).getTime() < asOf.getTime();
}

export function canStampIdentity(record: CredentialRecord, asOf: Date = new Date()): boolean {
  const catalog = catalogEntry(record.credentialType);
  if (!catalog.canStampIdentity && effectiveAuthority(record) !== "IDENTITY") return false;
  if (record.verificationStatus === "REJECTED") return false;
  if (isExpired(record.expiresOn, asOf) || record.verificationStatus === "EXPIRED") return false;
  return record.verificationStatus === "VERIFIED" || record.verificationStatus === "UNVERIFIED";
}

export function identityStampIndependence(record: CredentialRecord): "independent" | "self_attested" {
  return record.verificationStatus === "VERIFIED" ? "independent" : "self_attested";
}

export function canSignValue(record: CredentialRecord, asOf: Date = new Date()): {
  ok: boolean;
  reason: string;
} {
  const catalog = catalogEntry(record.credentialType);
  const authority = effectiveAuthority(record);
  if (!catalog.canSignValue || authority !== "VALUE") {
    return {
      ok: false,
      reason:
        catalog.type === "CA_VEHICLE_VERIFIER"
          ? "A California Vehicle Verifier license verifies identity. It cannot certify market value for a loan or net-worth statement."
          : `${catalog.label} does not authorize a signed independently appraised value.`,
    };
  }
  if (record.verificationStatus !== "VERIFIED") {
    return {
      ok: false,
      reason: "This value designation is on file but has not been verified by an administrator.",
    };
  }
  if (isExpired(record.expiresOn, asOf)) {
    return { ok: false, reason: "This value designation is expired." };
  }
  if (!record.uspapEducationCurrent) {
    return {
      ok: false,
      reason: "Current USPAP personal-property education is required to sign a value.",
    };
  }
  return { ok: true, reason: `${catalog.label} is current and verified for value.` };
}

export function signerIsIndependent(input: {
  signerUserId: string;
  clientUserId: string;
  collectionOwnerUserId: string;
}): { ok: boolean; reason: string } {
  if (input.signerUserId === input.collectionOwnerUserId || input.signerUserId === input.clientUserId) {
    return {
      ok: false,
      reason:
        "You cannot independently appraise a vehicle you own or that you requested as the client. Lenders require a disinterested appraiser.",
    };
  }
  return { ok: true, reason: "Signer is not the owner or the requesting client." };
}
