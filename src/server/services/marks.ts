import { calendarDateInTimeZone, DEFAULT_MARKS_TIMEZONE, shouldRefreshVehicleMark } from "@/domain/marks-schedule";
import { correlationId } from "@/lib/utils";
import { writeAudit } from "../audit";
import { getConfig } from "../config";
import { prisma } from "../db";
import { capturePortfolioSnapshot } from "./portfolio";
import { developVehicleValuation } from "./valuation";

export function marksTimeZone() {
  return process.env.MARKS_TIMEZONE || DEFAULT_MARKS_TIMEZONE;
}

export async function lastDailyMarksRunDate(now: Date = new Date()) {
  const today = calendarDateInTimeZone(now, marksTimeZone());
  const job = await prisma.importJob.findFirst({
    where: { name: "daily-marks", payloadHash: today },
  });
  return job ? today : null;
}

export async function runDailyCollectionMarks(options?: {
  force?: boolean;
  actorUserId?: string | null;
}) {
  const timeZone = marksTimeZone();
  const now = new Date();
  const today = calendarDateInTimeZone(now, timeZone);
  if (!options?.force) {
    const existing = await prisma.importJob.findFirst({
      where: { name: "daily-marks", payloadHash: today },
    });
    if (existing?.status === "SUCCEEDED" || existing?.status === "RUNNING") {
      return { skipped: true as const, date: today, reason: "Marks already ran for this calendar day." };
    }
  }

  const job = await prisma.importJob.upsert({
    where: { name_payloadHash: { name: "daily-marks", payloadHash: today } },
    create: { name: "daily-marks", payloadHash: today, status: "RUNNING", startedAt: now },
    update: { status: "RUNNING", startedAt: now, lastError: null },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { status: { in: ["OWNED", "CONSIGNED"] } },
    include: {
      collection: true,
      valuations: { orderBy: { effectiveOn: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    date: today,
    timeZone,
    vehicles: vehicles.length,
    refreshed: 0,
    snapshotted: 0,
    insufficient: 0,
    failed: 0,
  };
  const collections = new Set<string>();

  try {
    for (const vehicle of vehicles) {
      const latest = vehicle.valuations[0];
      const plan = shouldRefreshVehicleMark({
        latestStatus: latest?.status ?? null,
        latestEffectiveOn: latest?.effectiveOn ?? null,
        today,
        timeZone,
      });
      collections.add(vehicle.collectionId);
      if (plan.refresh) {
        try {
          const valuation = await developVehicleValuation(
            null,
            {
              vehicleId: vehicle.id,
              intendedUse: "Scheduled collection monitoring",
              intendedUsers: "Collector of record",
            },
            correlationId(),
            {
              skipAuth: true,
              actorUserId: options?.actorUserId ?? vehicle.collection.ownerUserId,
              source: "marks.daily",
              yearWindow: 4,
            },
          );
          summary.refreshed += 1;
          if (!valuation.estimatedValueMinor) summary.insufficient += 1;
        } catch {
          summary.failed += 1;
        }
      } else {
        summary.snapshotted += 1;
      }
    }

    for (const collectionId of collections) {
      const already = await prisma.portfolioSnapshot.findFirst({
        where: { collectionId },
        orderBy: { capturedOn: "desc" },
      });
      const alreadyToday =
        already && calendarDateInTimeZone(already.capturedOn, timeZone) === today;
      if (!alreadyToday) {
        await capturePortfolioSnapshot(collectionId);
      }
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), lastError: null },
    });
    await writeAudit({
      actorUserId: options?.actorUserId ?? null,
      action: "marks.daily",
      subjectType: "ImportJob",
      subjectId: job.id,
      newValue: summary,
      source: "marks.daily",
      correlationId: correlationId(),
      reason: "Nightly completed-sale refresh. No figures were invented.",
    });
    return { skipped: false as const, ...summary };
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        lastError: error instanceof Error ? error.message : "Daily marks failed.",
      },
    });
    throw error;
  }
}

export async function latestMarksJob() {
  return prisma.importJob.findFirst({
    where: { name: "daily-marks" },
    orderBy: { createdAt: "desc" },
  });
}

export function marksScheduleLabel() {
  const timeZone = marksTimeZone();
  return timeZone === "America/Los_Angeles" ? "Pacific" : timeZone.replaceAll("_", " ");
}

export function marksScheduleCopy() {
  const config = getConfig();
  return {
    timeZone: marksTimeZone(),
    label: marksScheduleLabel(),
    hourLabel: "12:00 a.m.",
    baseUrl: config.baseUrl,
  };
}
