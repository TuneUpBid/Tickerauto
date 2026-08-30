import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { contentHash, hashPassword, randomToken } from "@/domain/hashes";
import { assertReportImmutable } from "@/server/services/appraisal";

const url = process.env.DATABASE_URL;
const prisma = new PrismaClient();
const describeIfDb = url ? describe : describe.skip;

describeIfDb("report immutability and share lifecycle", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects silent mutation of a signed report and honors share expiry", async () => {
    const passwordHash = await hashPassword("Integration-Test-2026!");
    const org = await prisma.organization.create({
      data: { name: "Firm", type: "APPRAISAL_FIRM" },
    });
    const collectorOrg = await prisma.organization.create({
      data: { name: "Col", type: "COLLECTOR" },
    });
    const appraiser = await prisma.user.create({
      data: {
        email: `appr-${randomToken(3)}@test.local`,
        emailNormalized: `appr-${randomToken(3)}@test.local`,
        passwordHash,
        name: "Appraiser",
        emailVerifiedAt: new Date(),
      },
    });
    const collector = await prisma.user.create({
      data: {
        email: `col-${randomToken(3)}@test.local`,
        emailNormalized: `col-${randomToken(3)}@test.local`,
        passwordHash,
        name: "Collector",
        emailVerifiedAt: new Date(),
      },
    });
    const collection = await prisma.collection.create({
      data: { name: "C", organizationId: collectorOrg.id, ownerUserId: collector.id },
    });
    const assignment = await prisma.appraisalAssignment.create({
      data: {
        collectionId: collection.id,
        clientUserId: collector.id,
        clientOrgId: collectorOrg.id,
        appraiserUserId: appraiser.id,
        firmOrgId: org.id,
        intendedUse: "test",
        intendedUsers: "test",
        effectiveOn: new Date(),
        scopeOfWork: "test scope of work",
        status: "SUBMITTED",
      },
    });
    const payload = { value: 1 };
    const report = await prisma.appraisalReport.create({
      data: {
        assignmentId: assignment.id,
        publicId: `ML-${randomToken(4)}`,
        title: "Test",
        payload,
        certificationText: "draft",
        contentHash: contentHash(payload),
        status: "ACTIVE",
        finalizedAt: new Date(),
      },
    });
    await prisma.electronicSignature.create({
      data: {
        reportId: report.id,
        signerId: appraiser.id,
        signedAt: new Date(),
        statement: "draft",
        signatureHash: "sig",
      },
    });
    await expect(assertReportImmutable(report.id, { value: 2 })).rejects.toThrow(/immutable/);

    const expired = await prisma.reportShare.create({
      data: {
        reportId: report.id,
        createdById: collector.id,
        tokenHash: randomToken(),
        expiresAt: new Date(Date.now() - 1000),
        status: "ACTIVE",
      },
    });
    const revoked = await prisma.reportShare.create({
      data: {
        reportId: report.id,
        createdById: collector.id,
        tokenHash: randomToken(),
        expiresAt: new Date(Date.now() + 86400000),
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
    expect(expired.expiresAt < new Date()).toBe(true);
    expect(revoked.status).toBe("REVOKED");
  });
});
