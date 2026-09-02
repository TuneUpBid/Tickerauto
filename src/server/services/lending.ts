import { assembleLendingWorkfile } from "@/domain/lending-workfile";
import { canSignValue } from "@/domain/credentials";
import { prisma } from "../db";

const REQUIRED_SOLD_COMPS = 3;

export async function vehicleLendingWorkfile(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      collection: true,
      acquisition: true,
      verificationChecks: true,
      valuations: { orderBy: { effectiveOn: "desc" }, take: 1 },
      assignments: {
        include: {
          inspection: true,
          report: { include: { signature: true } },
          appraiser: { include: { credentials: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  const latestValuation = vehicle.valuations[0];
  const lendingAssignment =
    vehicle.assignments.find((item) =>
      ["LENDING_COLLATERAL", "NET_WORTH"].includes(item.engagementKind),
    ) ?? vehicle.assignments[0];
  const includedSold = latestValuation
    ? await prisma.comparableSelection.count({
        where: { comparableSet: { valuationId: latestValuation.id }, included: true },
      })
    : 0;
  const identityStamp = vehicle.verificationChecks.find((check) => check.type === "PHYSICAL_IDENTITY");
  const signer = lendingAssignment?.appraiser;
  const valueCredentialReady = Boolean(
    signer?.credentials.some((credential) => canSignValue(credential).ok),
  );
  const independent =
    Boolean(signer) &&
    signer!.id !== vehicle.collection.ownerUserId &&
    signer!.id !== lendingAssignment?.clientUserId;

  const workfile = assembleLendingWorkfile({
    vinPresent: Boolean(vehicle.vin),
    vinDecoded: vehicle.verificationChecks.some(
      (check) => check.type === "VIN_DECODE" && check.outcome === "PASSED",
    ),
    identityStamped: Boolean(identityStamp),
    identityStampByOwner: identityStamp?.summary?.includes("collection owner") ?? false,
    yearMakeModelPresent: Boolean(vehicle.year && vehicle.make && vehicle.model),
    draftEstimatePresent: Boolean(latestValuation?.estimatedValueMinor),
    includedSoldComps: includedSold,
    requiredSoldComps: REQUIRED_SOLD_COMPS,
    titleRecorded: vehicle.titleStatus !== "UNKNOWN",
    acquisitionRecorded: Boolean(vehicle.acquisition),
    inspectionRecorded: Boolean(lendingAssignment?.inspection),
    engagementKind: lendingAssignment?.engagementKind ?? "INTERNAL_MONITORING",
    independentValueSignerAssigned: independent,
    valueCredentialReady,
    reportSigned: Boolean(lendingAssignment?.report?.signature),
  });

  return {
    vehicle: {
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
    },
    assignmentId: lendingAssignment?.id ?? null,
    reportId: lendingAssignment?.report?.id ?? null,
    workfile,
  };
}

export async function collectionLendingWorkfiles(collectionId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { collectionId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(vehicles.map((vehicle) => vehicleLendingWorkfile(vehicle.id)));
}
