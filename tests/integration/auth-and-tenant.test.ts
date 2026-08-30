import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword, hashToken, randomToken } from "@/domain/hashes";
import { writeAudit } from "@/server/audit";
import { canAccessCollection, canMutateCollection } from "@/server/rbac";

const url = process.env.DATABASE_URL;
const prisma = new PrismaClient();

const describeIfDb = url ? describe : describe.skip;

describeIfDb("authentication, isolation, and audit", () => {
  const ids = {
    collectorA: "",
    collectorB: "",
    collectionA: "",
    collectionB: "",
    vehicleA: "",
  };

  beforeAll(async () => {
    const passwordHash = await hashPassword("Integration-Test-2026!");
    const orgA = await prisma.organization.create({ data: { name: "A", type: "COLLECTOR" } });
    const orgB = await prisma.organization.create({ data: { name: "B", type: "COLLECTOR" } });
    const userA = await prisma.user.create({
      data: {
        email: `a-${randomToken(4)}@test.local`,
        emailNormalized: `a-${randomToken(4)}@test.local`,
        passwordHash,
        name: "A",
        emailVerifiedAt: new Date(),
        memberships: { create: { organizationId: orgA.id, role: "COLLECTOR", status: "ACTIVE" } },
      },
      include: { memberships: { include: { organization: true } } },
    });
    const userB = await prisma.user.create({
      data: {
        email: `b-${randomToken(4)}@test.local`,
        emailNormalized: `b-${randomToken(4)}@test.local`,
        passwordHash,
        name: "B",
        emailVerifiedAt: new Date(),
        memberships: { create: { organizationId: orgB.id, role: "COLLECTOR", status: "ACTIVE" } },
      },
      include: { memberships: { include: { organization: true } } },
    });
    const collectionA = await prisma.collection.create({
      data: { name: "A", organizationId: orgA.id, ownerUserId: userA.id },
    });
    const collectionB = await prisma.collection.create({
      data: { name: "B", organizationId: orgB.id, ownerUserId: userB.id },
    });
    const vehicleA = await prisma.vehicle.create({
      data: { collectionId: collectionA.id, year: 1973, make: "Porsche", model: "911" },
    });
    ids.collectorA = userA.id;
    ids.collectorB = userB.id;
    ids.collectionA = collectionA.id;
    ids.collectionB = collectionB.id;
    ids.vehicleA = vehicleA.id;
    Object.assign(globalThis, { userA, userB, collectionA, collectionB });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("prevents collector B from mutating collector A vehicles", async () => {
    const userB = await prisma.user.findUnique({
      where: { id: ids.collectorB },
      include: { memberships: { include: { organization: true } } },
    });
    const collectionA = await prisma.collection.findUnique({ where: { id: ids.collectionA } });
    expect(userB && collectionA && canMutateCollection(userB, collectionA)).toBe(false);
    expect(userB && collectionA && canAccessCollection(userB, collectionA)).toBe(false);
  });

  it("stores hashed session tokens rather than plaintext", async () => {
    const token = randomToken();
    const session = await prisma.session.create({
      data: {
        userId: ids.collectorA,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60),
      },
    });
    expect(session.tokenHash).not.toBe(token);
    expect(session.tokenHash).toBe(hashToken(token));
  });

  it("writes immutable audit events", async () => {
    await writeAudit({
      actorUserId: ids.collectorA,
      action: "test.event",
      subjectType: "Vehicle",
      subjectId: ids.vehicleA,
      source: "test",
      correlationId: "corr-1",
    });
    const event = await prisma.auditEvent.findFirst({ where: { correlationId: "corr-1" } });
    expect(event?.immutable).toBe(true);
  });
});
