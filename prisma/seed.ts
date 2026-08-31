import { PrismaClient } from "@prisma/client";
import { DEFAULT_METHODOLOGY } from "../src/domain/valuation";
import { hashPassword } from "../src/domain/hashes";

const prisma = new PrismaClient();

async function main() {
  await prisma.methodologyVersion.upsert({
    where: { slug_version: { slug: "comps-fmv", version: DEFAULT_METHODOLOGY.version } },
    create: {
      slug: "comps-fmv",
      version: DEFAULT_METHODOLOGY.version,
      name: "Comparable-sales fair market estimate",
      valueType: "FAIR_MARKET",
      description:
        "Versioned comparable-sales methodology. Produces a source-backed market estimate, not an independently appraised value.",
      config: DEFAULT_METHODOLOGY as object,
      active: true,
    },
    update: {},
  });

  await prisma.certificationTemplate.upsert({
    where: { slug: "personal-property-draft" },
    create: {
      slug: "personal-property-draft",
      name: "Draft personal-property certification",
      body: "DRAFT — not reviewed by legal or appraisal counsel. See docs/architecture-and-valuation-methodology.md.",
      legalReviewStatus: "draft_unreviewed",
    },
    update: {},
  });

  const providers = [
    { slug: "old-cars-data", name: "Old Cars Data", kind: "auction" },
    { slug: "black-book", name: "Black Book", kind: "licensed-guide" },
    { slug: "jd-power", name: "J.D. Power", kind: "licensed-guide" },
    { slug: "vehicle-history", name: "Vehicle history", kind: "identity" },
    { slug: "title", name: "Title / lien", kind: "identity" },
  ];
  for (const provider of providers) {
    await prisma.marketProvider.upsert({
      where: { slug: provider.slug },
      create: { ...provider, health: "UNCONFIGURED" },
      update: {},
    });
  }

  if (process.env.APP_DEMO_MODE === "true") {
    const passwordHash = await hashPassword("CollectorDemo-2026!");
    const specs = [
      {
        email: "collector@demo.motorledger",
        name: "Demo Collector",
        role: "COLLECTOR" as const,
        orgType: "COLLECTOR" as const,
        org: "Demo Collection LLC",
      },
      {
        email: "appraiser@demo.motorledger",
        name: "Demo Appraiser",
        role: "APPRAISER" as const,
        orgType: "APPRAISAL_FIRM" as const,
        org: "Demo Appraisal Desk",
      },
      {
        email: "lender@demo.motorledger",
        name: "Demo Lender",
        role: "LENDER" as const,
        orgType: "LENDER" as const,
        org: "Demo Specialty Lender",
      },
      {
        email: "admin@demo.motorledger",
        name: "Demo Administrator",
        role: "ADMINISTRATOR" as const,
        orgType: "PLATFORM" as const,
        org: "Tickerauto Platform",
      },
    ];
    for (const spec of specs) {
      const emailNormalized = spec.email;
      const user = await prisma.user.upsert({
        where: { emailNormalized },
        create: {
          email: spec.email,
          emailNormalized,
          passwordHash,
          name: spec.name,
          emailVerifiedAt: new Date(),
        },
        update: { emailVerifiedAt: new Date() },
      });
      const organization = await prisma.organization.upsert({
        where: { id: `demo-${spec.role.toLowerCase()}` },
        create: { id: `demo-${spec.role.toLowerCase()}`, name: spec.org, type: spec.orgType },
        update: {},
      });
      await prisma.membership.upsert({
        where: {
          userId_organizationId_role: {
            userId: user.id,
            organizationId: organization.id,
            role: spec.role,
          },
        },
        create: {
          userId: user.id,
          organizationId: organization.id,
          role: spec.role,
          status: "ACTIVE",
        },
        update: { status: "ACTIVE" },
      });
      if (spec.role === "COLLECTOR") {
        const existing = await prisma.collection.findFirst({ where: { ownerUserId: user.id } });
        if (!existing) {
          await prisma.collection.create({
            data: {
              organizationId: organization.id,
              ownerUserId: user.id,
              name: "Demonstration collection",
              description: "Demonstration environment. No production valuations are seeded.",
            },
          });
        }
      }
      if (spec.role === "APPRAISER") {
        await prisma.appraiserCredential.createMany({
          data: [
            {
              userId: user.id,
              organization: "Demonstration credentialing body",
              credentialType: "Personal property (demonstration record)",
              specialty: "Collector automobiles",
              verificationStatus: "UNVERIFIED",
              notes: "Demonstration credential. Not presented as current or verified.",
            },
          ],
          skipDuplicates: true,
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
