import { Prisma, type UserRole } from "@prisma/client";
import { majorToMinor } from "@/domain/money";
import { validateVinCheckDigit } from "@/domain/vin";
import { eraFromYear, emptyToNull, splitList } from "@/lib/utils";
import type { VehicleInput } from "@/lib/validation";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { getIdentityProvider } from "../providers/verification";
import { canMutateCollection } from "../rbac";
import type { CurrentUser } from "../auth/session";

export async function requireCollectionAccess(user: CurrentUser, collectionId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: { organization: true },
  });
  if (!collection) throw new Error("Collection not found.");
  const allowed =
    collection.ownerUserId === user.id ||
    user.memberships.some(
      (membership) =>
        membership.status === "ACTIVE" &&
        (membership.organizationId === collection.organizationId ||
          membership.role === "ADMINISTRATOR"),
    );
  if (!allowed) throw new Error("Not authorized to access this collection.");
  return collection;
}

export async function createVehicle(user: CurrentUser, input: VehicleInput, correlationId: string) {
  const collection = await requireCollectionAccess(user, input.collectionId);
  if (!canMutateCollection(user, collection)) throw new Error("Not authorized to add vehicles.");

  const vin = emptyToNull(input.vin);
  const vehicle = await prisma.vehicle.create({
    data: {
      collectionId: collection.id,
      vin,
      chassisNumber: emptyToNull(input.chassisNumber),
      year: input.year,
      make: input.make.trim(),
      model: input.model.trim(),
      generation: emptyToNull(input.generation),
      series: emptyToNull(input.series),
      trim: emptyToNull(input.trim),
      bodyStyle: emptyToNull(input.bodyStyle),
      engine: emptyToNull(input.engine),
      transmission: emptyToNull(input.transmission),
      drivetrain: emptyToNull(input.drivetrain),
      exteriorColor: emptyToNull(input.exteriorColor),
      interiorColor: emptyToNull(input.interiorColor),
      currentMileage:
        input.currentMileage === "" || input.currentMileage === undefined
          ? null
          : Number(input.currentMileage),
      mileageUnit: input.mileageUnit,
      factoryOptions: splitList(input.factoryOptions),
      modifications: splitList(input.modifications),
      restorationHistory: emptyToNull(input.restorationHistory),
      matchingNumbersStatus: input.matchingNumbersStatus,
      conditionGrade: emptyToNull(input.conditionGrade),
      titleStatus: input.titleStatus,
      registrationJurisdiction: emptyToNull(input.registrationJurisdiction),
      storageLocation: emptyToNull(input.storageLocation),
      era: emptyToNull(input.era) ?? eraFromYear(input.year),
      category: emptyToNull(input.category),
    },
  });

  const vinCheck = validateVinCheckDigit(vin ?? "");
  await prisma.verificationCheck.create({
    data: {
      vehicleId: vehicle.id,
      type: "VIN_CHECK_DIGIT",
      provider: vinCheck.provider,
      outcome:
        vinCheck.outcome === "passed"
          ? "PASSED"
          : vinCheck.outcome === "failed"
            ? "FAILED"
            : vinCheck.outcome === "not_applicable"
              ? "INCONCLUSIVE"
              : "NOT_PERFORMED",
      performedAt: vinCheck.performed ? new Date() : null,
      sourceReference: vinCheck.performed ? "ISO 3779" : null,
      summary: vinCheck.summary,
    },
  });

  for (const type of [
    "VIN_DECODE",
    "TITLE",
    "LIEN",
    "THEFT",
    "SALVAGE_BRAND",
    "ODOMETER_HISTORY",
    "VEHICLE_HISTORY",
  ] as const) {
    const result = await getIdentityProvider(type).run({
      type,
      vin,
      year: input.year,
      make: input.make,
      model: input.model,
    });
    await prisma.verificationCheck.create({
      data: {
        vehicleId: vehicle.id,
        type,
        provider: result.provider,
        outcome: result.outcome,
        performedAt: result.performedAt,
        sourceReference: result.sourceReference,
        summary: result.summary,
      },
    });
  }

  await writeAudit({
    actorUserId: user.id,
    organizationId: collection.organizationId,
    action: "vehicle.created",
    subjectType: "Vehicle",
    subjectId: vehicle.id,
    newValue: { year: vehicle.year, make: vehicle.make, model: vehicle.model },
    source: "vehicles.create",
    correlationId,
  });
  return vehicle;
}

export async function recordAcquisition(
  user: CurrentUser,
  input: {
    vehicleId: string;
    acquiredOn: string;
    price: number;
    currency: string;
    buyerFees: number;
    transportation: number;
    taxes: number;
    counterparty?: string;
    notes?: string;
  },
  correlationId: string,
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
    include: { collection: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  if (!canMutateCollection(user, vehicle.collection)) throw new Error("Not authorized.");

  const price = majorToMinor(input.price, input.currency);
  const buyerFees = majorToMinor(input.buyerFees, input.currency);
  const transportation = majorToMinor(input.transportation, input.currency);
  const taxes = majorToMinor(input.taxes, input.currency);

  const acquisition = await prisma.acquisition.upsert({
    where: { vehicleId: vehicle.id },
    create: {
      vehicleId: vehicle.id,
      acquiredOn: new Date(input.acquiredOn),
      priceMinor: price.amountMinor,
      currency: input.currency,
      buyerFeesMinor: buyerFees.amountMinor,
      transportationMinor: transportation.amountMinor,
      taxesMinor: taxes.amountMinor,
      counterparty: input.counterparty ?? null,
      notes: input.notes ?? null,
    },
    update: {
      acquiredOn: new Date(input.acquiredOn),
      priceMinor: price.amountMinor,
      currency: input.currency,
      buyerFeesMinor: buyerFees.amountMinor,
      transportationMinor: transportation.amountMinor,
      taxesMinor: taxes.amountMinor,
      counterparty: input.counterparty ?? null,
      notes: input.notes ?? null,
    },
  });

  await writeAudit({
    actorUserId: user.id,
    organizationId: vehicle.collection.organizationId,
    action: "acquisition.recorded",
    subjectType: "Acquisition",
    subjectId: acquisition.id,
    newValue: { priceMinor: price.amountMinor.toString(), currency: input.currency },
    source: "vehicles.acquisition",
    correlationId,
  });
  return acquisition;
}

export async function recordExpense(
  user: CurrentUser,
  input: {
    vehicleId: string;
    category: Prisma.ExpenseCreateInput["category"];
    incurredOn: string;
    amount: number;
    currency: string;
    description?: string;
  },
  correlationId: string,
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: input.vehicleId },
    include: { collection: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  if (!canMutateCollection(user, vehicle.collection)) throw new Error("Not authorized.");
  const amount = majorToMinor(input.amount, input.currency);
  const expense = await prisma.expense.create({
    data: {
      vehicleId: vehicle.id,
      category: input.category,
      incurredOn: new Date(input.incurredOn),
      amountMinor: amount.amountMinor,
      currency: input.currency,
      description: input.description ?? null,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: vehicle.collection.organizationId,
    action: "expense.recorded",
    subjectType: "Expense",
    subjectId: expense.id,
    newValue: { category: input.category, amountMinor: amount.amountMinor.toString() },
    source: "vehicles.expense",
    correlationId,
  });
  return expense;
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case "APPRAISER":
      return "/assignments";
    case "LENDER":
      return "/lender";
    case "ADMINISTRATOR":
      return "/admin";
    default:
      return "/dashboard";
  }
}
