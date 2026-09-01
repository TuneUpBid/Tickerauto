import { Prisma, type UserRole } from "@prisma/client";
import { majorToMinor } from "@/domain/money";
import { validateVinCheckDigit } from "@/domain/vin";
import { eraFromYear, emptyToNull, splitList } from "@/lib/utils";
import type { VehicleInput } from "@/lib/validation";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { decodeNhtsaVin, type VinDecodeResult } from "../providers/nhtsa-vin";
import { getIdentityProvider } from "../providers/verification";
import { canMutateCollection } from "../rbac";
import type { CurrentUser } from "../auth/session";
import { capturePortfolioSnapshot } from "./portfolio";
import { developVehicleValuation } from "./valuation";

function filled(userValue: string | undefined, decoded: string | null | undefined) {
  const trimmed = userValue?.trim();
  return trimmed || decoded || null;
}

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
  const decoded = vin ? await decodeNhtsaVin(vin) : { ok: false as const, reason: "No VIN" };
  const decodedFields = decoded.ok ? decoded.decoded : null;
  const year = input.year ?? decodedFields?.year ?? null;
  const make = filled(input.make, decodedFields?.make);
  const model = filled(input.model, decodedFields?.model);
  if (!year || !make || !model) {
    throw new Error(
      "Year, make, and model are required. Enter them or a 17-character VIN that NHTSA can decode.",
    );
  }
  const vehicle = await prisma.vehicle.create({
    data: {
      collectionId: collection.id,
      vin,
      chassisNumber: emptyToNull(input.chassisNumber),
      year,
      make,
      model,
      generation: filled(input.generation, decodedFields?.series),
      series: filled(input.series, decodedFields?.series),
      trim: filled(input.trim, decodedFields?.trim),
      bodyStyle: filled(input.bodyStyle, decodedFields?.bodyStyle),
      engine: filled(input.engine, decodedFields?.engine),
      transmission: filled(input.transmission, decodedFields?.transmission),
      drivetrain: filled(input.drivetrain, decodedFields?.drivetrain),
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
      era: emptyToNull(input.era) ?? eraFromYear(year),
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

  await prisma.verificationCheck.create({
    data: vinDecodeCheckData(vehicle.id, vin, decoded),
  });

  for (const type of [
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
      year,
      make,
      model,
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

  await tryDevelopDraftValuation(user, vehicle.id, collection.id, correlationId);
  return vehicle;
}

function vinDecodeCheckData(vehicleId: string, vin: string | null, decoded: VinDecodeResult) {
  return {
    vehicleId,
    type: "VIN_DECODE" as const,
    provider: "NHTSA vPIC",
    outcome: !vin
      ? ("NOT_PERFORMED" as const)
      : decoded.ok
        ? ("PASSED" as const)
        : decoded.unavailable
          ? ("PROVIDER_UNAVAILABLE" as const)
          : ("INCONCLUSIVE" as const),
    performedAt: vin ? new Date() : null,
    sourceReference: vin ? "https://vpic.nhtsa.dot.gov" : null,
    summary: decoded.ok ? decoded.summary : vin ? decoded.reason : "No VIN was provided.",
  };
}

async function tryDevelopDraftValuation(
  user: CurrentUser,
  vehicleId: string,
  collectionId: string,
  correlationId: string,
) {
  try {
    await developVehicleValuation(
      user,
      {
        vehicleId,
        intendedUse: "Collector portfolio tracking",
        intendedUsers: "Vehicle owner",
      },
      correlationId,
    );
    await capturePortfolioSnapshot(collectionId);
  } catch {
    // Identity is already saved. Missing comps must not block the vehicle record.
  }
}

export async function applyVinDecodeToVehicle(
  user: CurrentUser,
  vehicleId: string,
  correlationId: string,
  options?: { developValuation?: boolean },
) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { collection: true },
  });
  if (!vehicle) throw new Error("Vehicle not found.");
  if (!canMutateCollection(user, vehicle.collection)) throw new Error("Not authorized.");
  if (!vehicle.vin) throw new Error("This vehicle has no VIN to decode.");

  const decoded = await decodeNhtsaVin(vehicle.vin);
  await prisma.verificationCheck.create({
    data: vinDecodeCheckData(vehicle.id, vehicle.vin, decoded),
  });
  if (!decoded.ok) {
    return { vehicle, decoded };
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicle.id },
    data: {
      year: vehicle.year || decoded.decoded.year || vehicle.year,
      make: filled(vehicle.make, decoded.decoded.make) ?? vehicle.make,
      model: filled(vehicle.model, decoded.decoded.model) ?? vehicle.model,
      generation: filled(vehicle.generation ?? undefined, decoded.decoded.series),
      series: filled(vehicle.series ?? undefined, decoded.decoded.series),
      trim: filled(vehicle.trim ?? undefined, decoded.decoded.trim),
      bodyStyle: filled(vehicle.bodyStyle ?? undefined, decoded.decoded.bodyStyle),
      engine: filled(vehicle.engine ?? undefined, decoded.decoded.engine),
      transmission: filled(vehicle.transmission ?? undefined, decoded.decoded.transmission),
      drivetrain: filled(vehicle.drivetrain ?? undefined, decoded.decoded.drivetrain),
    },
  });

  await writeAudit({
    actorUserId: user.id,
    organizationId: vehicle.collection.organizationId,
    action: "vehicle.vin_decoded",
    subjectType: "Vehicle",
    subjectId: vehicle.id,
    newValue: {
      year: updated.year,
      make: updated.make,
      model: updated.model,
      trim: updated.trim,
      engine: updated.engine,
    },
    source: "vehicles.vinDecode",
    correlationId,
  });

  if (options?.developValuation) {
    await tryDevelopDraftValuation(user, vehicle.id, vehicle.collectionId, correlationId);
  }
  return { vehicle: updated, decoded };
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
