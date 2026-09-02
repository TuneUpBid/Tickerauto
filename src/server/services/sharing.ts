import { hashToken, randomToken } from "@/domain/hashes";
import { getConfig } from "../config";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { canMutateCollection, hasRole } from "../rbac";
import { clientKey, rateLimit } from "../rate-limit";
import type { CurrentUser } from "../auth/session";

export async function shareReport(
  user: CurrentUser,
  input: { reportId: string; lenderOrgId?: string; expiresInDays: number; canDownload: boolean },
  ip: string | null,
  correlationId: string,
) {
  const limited = rateLimit(clientKey("share", ip), getConfig().rateLimit.sharePerMinute);
  if (!limited.ok) throw new Error("Too many sharing requests. Try again shortly.");

  const report = await prisma.appraisalReport.findUnique({
    where: { id: input.reportId },
    include: { assignment: { include: { collection: true } }, signature: true },
  });
  if (!report) throw new Error("Report not found.");
  if (!report.signature || report.status === "DRAFT") {
    throw new Error("Only signed reports can be shared with a lender.");
  }
  if (!canMutateCollection(user, report.assignment.collection) && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Not authorized to share this report.");
  }
  const token = randomToken(24);
  const share = await prisma.reportShare.create({
    data: {
      reportId: report.id,
      createdById: user.id,
      lenderOrgId: input.lenderOrgId || null,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000),
      canDownload: input.canDownload,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: report.assignment.collection.organizationId,
    action: "report.shared",
    subjectType: "ReportShare",
    subjectId: share.id,
    source: "sharing.create",
    correlationId,
    ipAddress: ip,
  });
  return { share, token, url: `${getConfig().baseUrl}/lender/shares/${token}` };
}

export async function revokeShare(user: CurrentUser, shareId: string, correlationId: string) {
  const share = await prisma.reportShare.findUnique({
    where: { id: shareId },
    include: { report: { include: { assignment: { include: { collection: true } } } } },
  });
  if (!share) throw new Error("Share not found.");
  if (share.createdById !== user.id && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Not authorized to revoke this share.");
  }
  const updated = await prisma.reportShare.update({
    where: { id: shareId },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "report.share_revoked",
    subjectType: "ReportShare",
    subjectId: shareId,
    source: "sharing.revoke",
    correlationId,
  });
  return updated;
}

export async function loadShareByToken(token: string, user: CurrentUser | null) {
  const share = await prisma.reportShare.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      report: {
        include: {
          signature: { include: { signer: true } },
          assignment: {
            include: {
              collection: true,
              vehicle: true,
              valuation: true,
              appraiser: { include: { credentials: true } },
              client: true,
            },
          },
        },
      },
      decisions: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!share) return { ok: false as const, reason: "Share not found." };
  if (share.status === "REVOKED")
    return { ok: false as const, reason: "This share has been revoked." };
  if (share.expiresAt < new Date() || share.status === "EXPIRED") {
    return { ok: false as const, reason: "This share has expired." };
  }
  if (
    share.lenderOrgId &&
    user &&
    !hasRole(user, "LENDER", share.lenderOrgId) &&
    !hasRole(user, "ADMINISTRATOR")
  ) {
    return {
      ok: false as const,
      reason: "This share is limited to the authorized lender organization.",
    };
  }
  await prisma.accessLog.create({
    data: { shareId: share.id, userId: user?.id, action: "view" },
  });
  return { ok: true as const, share };
}

export async function recordLenderDecision(
  user: CurrentUser,
  input: {
    shareId: string;
    status: "ACCEPTED" | "REJECTED" | "ADDITIONAL_EVIDENCE_REQUIRED";
    reason: string;
  },
  correlationId: string,
) {
  if (!hasRole(user, "LENDER") && !hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Only an authorized lender user can record methodology or report acceptance.");
  }
  const decision = await prisma.lenderDecision.create({
    data: {
      shareId: input.shareId,
      actorUserId: user.id,
      status: input.status,
      reason: input.reason,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "lender.decision",
    subjectType: "LenderDecision",
    subjectId: decision.id,
    newValue: { status: input.status, reason: input.reason },
    source: "lender.decision",
    correlationId,
    reason: "Explicit lender action. Approval is never inferred.",
  });
  return decision;
}
