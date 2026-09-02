import { describe, expect, it } from "vitest";
import {
  canSignValue,
  canStampIdentity,
  catalogEntry,
  signerIsIndependent,
} from "@/domain/credentials";
import { assembleLendingWorkfile } from "@/domain/lending-workfile";

describe("credential authority", () => {
  it("lets a California Vehicle Verifier stamp identity but not value", () => {
    const cvv = {
      credentialType: "CA_VEHICLE_VERIFIER",
      verificationStatus: "VERIFIED",
      uspapEducationCurrent: true,
    };
    expect(canStampIdentity(cvv)).toBe(true);
    expect(canSignValue(cvv).ok).toBe(false);
    expect(canSignValue(cvv).reason).toMatch(/cannot certify market value/i);
    expect(catalogEntry("CA_VEHICLE_VERIFIER").canSignValue).toBe(false);
  });

  it("requires verified designation, current USPAP, and a non-owner signer", () => {
    const iaaa = {
      credentialType: "IAAA",
      verificationStatus: "UNVERIFIED",
      uspapEducationCurrent: true,
    };
    expect(canSignValue(iaaa).ok).toBe(false);
    iaaa.verificationStatus = "VERIFIED";
    expect(canSignValue(iaaa).ok).toBe(true);
    expect(
      signerIsIndependent({
        signerUserId: "owner",
        clientUserId: "owner",
        collectionOwnerUserId: "owner",
      }).ok,
    ).toBe(false);
    expect(
      signerIsIndependent({
        signerUserId: "appraiser",
        clientUserId: "owner",
        collectionOwnerUserId: "owner",
      }).ok,
    ).toBe(true);
  });
});

describe("lending workfile", () => {
  it("treats software assembly as ready for a human, not as a signed appraisal", () => {
    const pack = assembleLendingWorkfile({
      vinPresent: true,
      vinDecoded: true,
      identityStamped: true,
      identityStampByOwner: true,
      yearMakeModelPresent: true,
      draftEstimatePresent: true,
      includedSoldComps: 3,
      requiredSoldComps: 3,
      titleRecorded: false,
      acquisitionRecorded: false,
      inspectionRecorded: false,
      engagementKind: "LENDING_COLLATERAL",
      independentValueSignerAssigned: false,
      valueCredentialReady: false,
      reportSigned: false,
    });
    expect(pack.readyForHumanReview).toBe(true);
    expect(pack.blockersForSignature).toContain("Inspection");
    expect(pack.blockersForSignature).toContain("Disinterested value appraiser");
    expect(pack.headline).toMatch(/still has to inspect and sign/);
  });
});
