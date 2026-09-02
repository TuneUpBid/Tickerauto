import { canStampIdentity, catalogEntry } from "@/domain/credentials";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { canMutateCollection } from "../rbac";
import type { CurrentUser } from "../auth/session";

export async function stampVehicleIdentity(
  user: CurrentUser,
  vehicleId: string,
  input: { location?: string; notes?: string },
  correlationId: string,
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { collection: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  if (!canMutateCollection(user, vehicle.collection) && vehicle.collection.ownerUserId !== user.id) {
    throw new Error("Not authorized to stamp this vehicle.");
  }
  if (!vehicle.vin) throw new Error("A VIN is required before an identity stamp.");

  const credentials = await prisma.appraiserCredential.findMany({ where: { userId: user.id } });
  const usable = credentials.find((credential) => canStampIdentity(credential));
  if (!usable) {
    throw new Error(
      "Add a California Vehicle Verifier license under Settings before stamping identity.",
    );
  }
  const catalog = catalogEntry(usable.credentialType);
  const ownerPerformed = user.id === vehicle.collection.ownerUserId;
  const summary = [
    `${catalog.label} ${usable.credentialNumber ?? "number on file"} inspected VIN ${vehicle.vin}.`,
    ownerPerformed
      ? "Performed by the collection owner. This verifies identity, not value, and is not an independent appraisal."
      : "Performed by a verifier who is not the collection owner.",
    usable.verificationStatus === "UNVERIFIED"
      ? "License is self-reported and not yet administrator-verified."
      : "License record is administrator-verified.",
    input.notes?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const check = await prisma.verificationCheck.create({
    data: {
      vehicleId: vehicle.id,
      type: "PHYSICAL_IDENTITY",
      provider: catalog.issuer,
      outcome: "PASSED",
      performedAt: new Date(),
      sourceReference: usable.credentialNumber
        ? `${catalog.type} ${usable.credentialNumber}`
        : catalog.type,
      summary,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: vehicle.collection.organizationId,
    action: "identity.stamped",
    subjectType: "VerificationCheck",
    subjectId: check.id,
    newValue: { vehicleId: vehicle.id, ownerPerformed },
    source: "identity.stamp",
    correlationId,
  });
  return check;
}
