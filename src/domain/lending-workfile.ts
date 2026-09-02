export interface LendingWorkfileInput {
  vinPresent: boolean;
  vinDecoded: boolean;
  identityStamped: boolean;
  identityStampByOwner: boolean;
  yearMakeModelPresent: boolean;
  draftEstimatePresent: boolean;
  includedSoldComps: number;
  requiredSoldComps: number;
  titleRecorded: boolean;
  acquisitionRecorded: boolean;
  inspectionRecorded: boolean;
  engagementKind: string;
  independentValueSignerAssigned: boolean;
  valueCredentialReady: boolean;
  reportSigned: boolean;
}

export interface LendingWorkfileItem {
  id: string;
  label: string;
  done: boolean;
  softwareCanPrepare: boolean;
  note: string;
}

export interface LendingWorkfile {
  items: LendingWorkfileItem[];
  completed: number;
  remaining: number;
  readyForHumanReview: boolean;
  blockersForSignature: string[];
  headline: string;
}

const LENDING_ENGAGEMENTS = new Set(["LENDING_COLLATERAL", "NET_WORTH"]);

export function assembleLendingWorkfile(input: LendingWorkfileInput): LendingWorkfile {
  const compsOk = input.includedSoldComps >= input.requiredSoldComps && input.draftEstimatePresent;
  const items: LendingWorkfileItem[] = [
    {
      id: "identity-vin",
      label: "VIN on file",
      done: input.vinPresent,
      softwareCanPrepare: true,
      note: input.vinPresent ? "VIN is recorded." : "Add the VIN so NHTSA and a verifier can work.",
    },
    {
      id: "identity-decode",
      label: "NHTSA decode",
      done: input.vinDecoded,
      softwareCanPrepare: true,
      note: input.vinDecoded
        ? "Decoder fields are stored."
        : "17-character VINs decode automatically. Pre-1981 chassis numbers stay as entered.",
    },
    {
      id: "identity-stamp",
      label: "Physical identity stamp",
      done: input.identityStamped,
      softwareCanPrepare: false,
      note: input.identityStamped
        ? input.identityStampByOwner
          ? "Stamped by the owner as a California Vehicle Verifier. Identity only; not independent."
          : "Identity was stamped by a verifier."
        : "A California Vehicle Verifier can stamp VIN/identity. That stamp is not a value.",
    },
    {
      id: "subject",
      label: "Year, make, and model",
      done: input.yearMakeModelPresent,
      softwareCanPrepare: true,
      note: input.yearMakeModelPresent ? "Subject identity is stated." : "Required before comps can run.",
    },
    {
      id: "comps",
      label: "Completed-sale evidence",
      done: compsOk,
      softwareCanPrepare: true,
      note: compsOk
        ? `${input.includedSoldComps} included sold comps support a draft estimate.`
        : `${input.includedSoldComps} included sold comps; ${input.requiredSoldComps} are required. Software will not invent a figure.`,
    },
    {
      id: "title",
      label: "Title status recorded",
      done: input.titleRecorded,
      softwareCanPrepare: false,
      note: input.titleRecorded ? "Title status is on the file." : "Credit shops reject a clean appraisal with an unknown title.",
    },
    {
      id: "acquisition",
      label: "Acquisition cost recorded",
      done: input.acquisitionRecorded,
      softwareCanPrepare: false,
      note: input.acquisitionRecorded
        ? "Purchase price is recorded."
        : "Enter the actual price. Do not estimate cost basis.",
    },
    {
      id: "inspection",
      label: "Inspection",
      done: input.inspectionRecorded,
      softwareCanPrepare: false,
      note: input.inspectionRecorded
        ? "An inspection is on the assignment."
        : "A person still has to see the car or the documented photos.",
    },
    {
      id: "engagement",
      label: "Lending or net-worth engagement",
      done: LENDING_ENGAGEMENTS.has(input.engagementKind),
      softwareCanPrepare: true,
      note: LENDING_ENGAGEMENTS.has(input.engagementKind)
        ? `Engagement is ${input.engagementKind}.`
        : "Request an assignment with intended use for a loan file or a personal financial statement.",
    },
    {
      id: "independence",
      label: "Disinterested value appraiser",
      done: input.independentValueSignerAssigned,
      softwareCanPrepare: false,
      note: input.independentValueSignerAssigned
        ? "An appraiser other than the owner is assigned."
        : "The owner cannot sign their own collateral opinion.",
    },
    {
      id: "value-credential",
      label: "Verified value designation + current USPAP",
      done: input.valueCredentialReady,
      softwareCanPrepare: false,
      note: input.valueCredentialReady
        ? "Signer has a verified value credential."
        : "ASA, IAAA, ISA, or another verified designation is required. A verifier license is not enough.",
    },
    {
      id: "signed",
      label: "Signed independently appraised value",
      done: input.reportSigned,
      softwareCanPrepare: false,
      note: input.reportSigned
        ? "A human signed. Corrections need a new version."
        : "Software prepares the workfile. It will not stamp the number.",
    },
  ];

  const completed = items.filter((item) => item.done).length;
  const blockersForSignature = items
    .filter((item) => !item.done && !item.softwareCanPrepare)
    .map((item) => item.label);
  const softwareDone = items.filter((item) => item.softwareCanPrepare).every((item) => item.done);
  const readyForHumanReview = softwareDone && !input.reportSigned;
  const headline = input.reportSigned
    ? "Signed independently appraised value is on file. A lender still has to accept it."
    : readyForHumanReview
      ? "Software has prepared the workfile. A disinterested appraiser still has to inspect and sign."
      : "Lending file is incomplete. Missing sold comps or identity stay blank rather than invented.";

  return {
    items,
    completed,
    remaining: items.length - completed,
    readyForHumanReview,
    blockersForSignature,
    headline,
  };
}
