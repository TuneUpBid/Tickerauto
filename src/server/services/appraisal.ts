import { contentHash, randomToken, sha256Hex } from "@/domain/hashes";
import { canSignValue, signerIsIndependent } from "@/domain/credentials";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { canMutateCollection, hasRole } from "../rbac";
import type { CurrentUser } from "../auth/session";

const DRAFT_CERTIFICATION = `DRAFT CERTIFICATION LANGUAGE — NOT APPROVED FOR PRODUCTION LEGAL USE.

I certify that, to the best of my knowledge and belief:
1. The statements of fact contained in this report are true and correct to the extent of the evidence reviewed.
2. The reported analyses, opinions, and conclusions are limited only by the reported assumptions and limiting conditions.
3. I have no (or the specified) present or prospective interest in the property that is the subject of this report.
4. I have performed this assignment independently and have not guaranteed any result.
5. This report is USPAP-compatible in workflow only. USPAP compatibility does not by itself make a report compliant.
6. Legal and appraisal professionals must approve production report language before this template is used with clients or lenders.

This language is configurable and has not been reviewed by qualified appraisal or legal professionals.`;

export async function ensureCertificationTemplate() {
  return prisma.certificationTemplate.upsert({
    where: { slug: "personal-property-draft" },
    create: {
      slug: "personal-property-draft",
      name: "Draft personal-property certification",
      body: DRAFT_CERTIFICATION,
      legalReviewStatus: "draft_unreviewed",
    },
    update: {},
  });
}

export async function requestAppraisal(
  user: CurrentUser,
  input: {
    collectionId: string;
    vehicleId?: string;
    valuationId?: string;
    intendedUse: string;
    intendedUsers: string;
    engagementKind?: string;
    valueType?:
      | "FAIR_MARKET"
      | "RETAIL_MARKET"
      | "WHOLESALE"
      | "ORDERLY_LIQUIDATION"
      | "FORCED_SALE"
      | "INSURANCE_AGREED";
    effectiveOn: string;
    scopeOfWork: string;
  },
  correlationId: string,
) {
  const collection = await prisma.collection.findUnique({ where: { id: input.collectionId } });
  if (!collection) throw new Error("Collection not found.");
  if (!canMutateCollection(user, collection)) throw new Error("Not authorized.");

  const assignment = await prisma.appraisalAssignment.create({
    data: {
      collectionId: collection.id,
      vehicleId: input.vehicleId || null,
      valuationId: input.valuationId || null,
      clientUserId: user.id,
      clientOrgId: collection.organizationId,
      intendedUse: input.intendedUse,
      intendedUsers: input.intendedUsers,
      engagementKind: input.engagementKind ?? "INTERNAL_MONITORING",
      valueType: input.valueType ?? "FAIR_MARKET",
      effectiveOn: new Date(input.effectiveOn),
      scopeOfWork: input.scopeOfWork,
      status: "REQUESTED",
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: collection.organizationId,
    action: "appraisal.requested",
    subjectType: "AppraisalAssignment",
    subjectId: assignment.id,
    source: "appraisal.request",
    correlationId,
  });
  return assignment;
}

export async function acceptAssignment(
  user: CurrentUser,
  assignmentId: string,
  correlationId: string,
) {
  if (!hasRole(user, "APPRAISER") && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Only an appraiser can accept an assignment.");
  }
  const membership = user.memberships.find(
    (item) => item.role === "APPRAISER" && item.status === "ACTIVE",
  );
  const assignment = await prisma.appraisalAssignment.update({
    where: { id: assignmentId },
    data: {
      appraiserUserId: user.id,
      firmOrgId: membership?.organizationId,
      status: "ACCEPTED",
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: assignment.firmOrgId,
    action: "appraisal.accepted",
    subjectType: "AppraisalAssignment",
    subjectId: assignment.id,
    source: "appraisal.accept",
    correlationId,
  });
  return assignment;
}

export async function recordInspection(
  user: CurrentUser,
  input: {
    assignmentId: string;
    type: "PHYSICAL" | "REMOTE_DOCUMENTED";
    inspectedAt: string;
    location?: string;
    notes?: string;
    conditionChecklist?: Record<string, string>;
    collectorAcknowledged?: boolean;
  },
  correlationId: string,
) {
  const assignment = await prisma.appraisalAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!assignment) throw new Error("Assignment not found.");
  if (assignment.appraiserUserId !== user.id && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Only the assigned appraiser can record an inspection.");
  }
  if (!assignment.vehicleId) throw new Error("Assignment has no subject vehicle.");
  const evidence = {
    assignmentId: input.assignmentId,
    inspectedAt: input.inspectedAt,
    notes: input.notes ?? "",
    checklist: input.conditionChecklist ?? {},
  };
  const inspection = await prisma.inspection.upsert({
    where: { assignmentId: assignment.id },
    create: {
      assignmentId: assignment.id,
      vehicleId: assignment.vehicleId,
      inspectorUserId: user.id,
      type: input.type,
      inspectedAt: new Date(input.inspectedAt),
      location: input.location ?? null,
      inspectorNotes: input.notes ?? null,
      conditionChecklist: input.conditionChecklist ?? {},
      collectorAcknowledged: Boolean(input.collectorAcknowledged),
      evidenceChecksum: contentHash(evidence),
    },
    update: {
      type: input.type,
      inspectedAt: new Date(input.inspectedAt),
      location: input.location ?? null,
      inspectorNotes: input.notes ?? null,
      conditionChecklist: input.conditionChecklist ?? {},
      collectorAcknowledged: Boolean(input.collectorAcknowledged),
      evidenceChecksum: contentHash(evidence),
    },
  });
  await prisma.appraisalAssignment.update({
    where: { id: assignment.id },
    data: { status: "INSPECTION_COMPLETE" },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "inspection.recorded",
    subjectType: "Inspection",
    subjectId: inspection.id,
    source: "appraisal.inspect",
    correlationId,
  });
  return inspection;
}

export async function buildDraftReport(
  user: CurrentUser,
  assignmentId: string,
  correlationId: string,
) {
  const assignment = await prisma.appraisalAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      collection: true,
      vehicle: {
        include: { acquisition: true, titles: true, liens: true, insurancePolicies: true },
      },
      valuation: {
        include: {
          methodologyVersion: true,
          comparableSet: {
            include: { selections: { include: { marketTransaction: true, adjustments: true } } },
          },
        },
      },
      inspection: true,
      appraiser: { include: { credentials: true } },
      client: true,
    },
  });
  if (!assignment) throw new Error("Assignment not found.");
  if (assignment.appraiserUserId !== user.id && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Only the assigned appraiser can prepare the report.");
  }
  const template = await ensureCertificationTemplate();
  const publicId = `ML-${randomToken(6).slice(0, 10).toUpperCase()}`;
  const payload = {
    reportIdentifier: publicId,
    version: 1,
    client: { name: assignment.client.name, email: assignment.client.email },
    intendedUsers: assignment.intendedUsers,
    intendedUse: assignment.intendedUse,
    collection: { id: assignment.collection.id, name: assignment.collection.name },
    vehicle: assignment.vehicle
      ? {
          id: assignment.vehicle.id,
          year: assignment.vehicle.year,
          make: assignment.vehicle.make,
          model: assignment.vehicle.model,
          vin: assignment.vehicle.vin,
          titleStatus: assignment.vehicle.titleStatus,
        }
      : null,
    valuation: assignment.valuation
      ? {
          id: assignment.valuation.id,
          status: assignment.valuation.status,
          estimatedValueMinor: assignment.valuation.estimatedValueMinor?.toString() ?? null,
          rangeLowMinor: assignment.valuation.rangeLowMinor?.toString() ?? null,
          rangeHighMinor: assignment.valuation.rangeHighMinor?.toString() ?? null,
          methodology: assignment.valuation.methodologyVersion.version,
          comparables: assignment.valuation.comparableSet?.selections.map((sel) => ({
            source: sel.marketTransaction.source,
            url: sel.marketTransaction.sourceUrl,
            included: sel.included,
            similarity: sel.similarityScore,
            raw: sel.rawValueMinor?.toString() ?? null,
            adjusted: sel.adjustedValueMinor?.toString() ?? null,
            reason: sel.inclusionReason || sel.exclusionReason,
          })),
        }
      : null,
    inspection: assignment.inspection
      ? {
          type: assignment.inspection.type,
          inspectedAt: assignment.inspection.inspectedAt,
          checksum: assignment.inspection.evidenceChecksum,
        }
      : null,
    credentials: assignment.appraiser?.credentials ?? [],
    disclosures: [
      "Market estimates are opinions based on available evidence.",
      "Past appreciation does not guarantee future appreciation.",
      "Asking prices and active bids are not completed-sale evidence.",
      "Appraisals may expire as markets and vehicle conditions change.",
      "Lenders independently determine collateral eligibility and LTV.",
      "The platform does not itself make lending decisions.",
      "USPAP compatibility does not by itself make a report compliant.",
    ],
  };
  const report = await prisma.appraisalReport.upsert({
    where: { assignmentId: assignment.id },
    create: {
      assignmentId: assignment.id,
      publicId,
      version: 1,
      status: "DRAFT",
      title: `Collateral valuation package — ${assignment.collection.name}`,
      payload,
      certificationText: template.body,
    },
    update: {
      payload,
      certificationText: template.body,
    },
  });
  await prisma.appraisalAssignment.update({
    where: { id: assignment.id },
    data: { status: "SUBMITTED" },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "report.drafted",
    subjectType: "AppraisalReport",
    subjectId: report.id,
    source: "appraisal.report",
    correlationId,
  });
  return report;
}

export async function signReport(user: CurrentUser, reportId: string, correlationId: string) {
  const report = await prisma.appraisalReport.findUnique({
    where: { id: reportId },
    include: {
      assignment: { include: { collection: true } },
      signature: true,
    },
  });
  if (!report) throw new Error("Report not found.");
  if (report.signature) throw new Error("Signed reports are immutable and cannot be re-signed.");
  if (report.assignment.appraiserUserId !== user.id) {
    throw new Error("Only the assigned appraiser may sign this report.");
  }
  const independence = signerIsIndependent({
    signerUserId: user.id,
    clientUserId: report.assignment.clientUserId,
    collectionOwnerUserId: report.assignment.collection.ownerUserId,
  });
  if (!independence.ok) throw new Error(independence.reason);
  const credentials = await prisma.appraiserCredential.findMany({ where: { userId: user.id } });
  const valueReady = credentials
    .map((credential) => canSignValue(credential))
    .find((result) => result.ok);
  if (!valueReady) {
    const first = credentials[0]
      ? canSignValue(credentials[0]).reason
      : "No value designation is on file.";
    throw new Error(
      `${first} A California Vehicle Verifier license cannot certify market value.`,
    );
  }
  const hash = contentHash(report.payload);
  const signedAt = new Date();
  await prisma.$transaction([
    prisma.appraisalReport.update({
      where: { id: report.id },
      data: {
        contentHash: hash,
        status: "ACTIVE",
        finalizedAt: signedAt,
        expiresOn: new Date(signedAt.getTime() + 180 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.electronicSignature.create({
      data: {
        reportId: report.id,
        signerId: user.id,
        signedAt,
        statement: report.certificationText,
        signatureHash: sha256Hex(`${user.id}:${hash}:${signedAt.toISOString()}`),
      },
    }),
    prisma.appraisalAssignment.update({
      where: { id: report.assignmentId },
      data: { status: "CERTIFIED" },
    }),
    prisma.valuation.updateMany({
      where: { id: report.assignment.valuationId ?? "__none__" },
      data: { status: "CERTIFIED", reviewerUserId: user.id },
    }),
  ]);
  await writeAudit({
    actorUserId: user.id,
    action: "report.signed",
    subjectType: "AppraisalReport",
    subjectId: report.id,
    newValue: { contentHash: hash },
    source: "appraisal.sign",
    correlationId,
    reason: "Independent appraiser signature. Subsequent corrections require a new version.",
  });
  return { id: report.id, contentHash: hash };
}

export async function assertReportImmutable(reportId: string, nextPayload: unknown) {
  const report = await prisma.appraisalReport.findUnique({
    where: { id: reportId },
    include: { signature: true },
  });
  if (!report?.signature || !report.contentHash) return;
  if (contentHash(nextPayload) !== report.contentHash) {
    throw new Error(
      "Signed reports are immutable. Create a new version that supersedes this report.",
    );
  }
}
