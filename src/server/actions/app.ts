"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  acquisitionSchema,
  appraisalRequestSchema,
  collectionSchema,
  expenseSchema,
  lenderDecisionSchema,
  shareReportSchema,
  valuationRequestSchema,
  vehicleSchema,
  credentialSchema,
} from "@/lib/validation";
import { correlationId } from "@/lib/utils";
import { getCurrentUser } from "../auth/session";
import { prisma } from "../db";
import {
  requestAppraisal,
  acceptAssignment,
  recordInspection,
  buildDraftReport,
  signReport,
} from "../services/appraisal";
import {
  importAuthorizedJson,
  probeOldCarsDataConnection,
  refreshFromLiveProvider,
} from "../services/market";
import {
  applyVinDecodeToVehicle,
  recordAcquisition,
  recordExpense,
  createVehicle,
} from "../services/vehicles";
import { decodeNhtsaVin, type DecodedVin } from "../providers/nhtsa-vin";
import { addCredential, verifyCredential } from "../services/credentials";
import { stampVehicleIdentity } from "../services/identity-stamp";
import { developVehicleValuation } from "../services/valuation";
import { recordLenderDecision, revokeShare, shareReport } from "../services/sharing";
import { capturePortfolioSnapshot } from "../services/portfolio";
import { getDocumentStorage } from "../providers/storage";
import { getMalwareScanner } from "../providers/malware-scan";
import { writeAudit } from "../audit";
import { canMutateCollection } from "../rbac";
import type { OldCarsAuctionRecord } from "@/domain/market-map";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function createCollectionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = collectionSchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid collection." };
  const membership = user.memberships.find(
    (item) => item.role === "COLLECTOR" && item.status === "ACTIVE",
  );
  if (!membership) return { error: "Collector organization membership is required." };
  const collection = await prisma.collection.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      organizationId: membership.organizationId,
      ownerUserId: user.id,
    },
  });
  revalidatePath("/dashboard");
  redirect(`/collections/${collection.id}`);
}

export async function decodeVinAction(vin: string): Promise<{
  error?: string;
  summary?: string;
  decoded?: DecodedVin;
}> {
  await requireUser();
  const result = await decodeNhtsaVin(vin);
  if (!result.ok) return { error: result.reason };
  return { summary: result.summary, decoded: result.decoded };
}

export async function fillVehicleFromVinAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const vehicleId = text(formData, "vehicleId");
  if (!vehicleId) return { error: "Vehicle is required." };
  try {
    const { decoded } = await applyVinDecodeToVehicle(user, vehicleId, correlationId(), {
      developValuation: true,
    });
    if (!decoded.ok) return { error: decoded.reason };
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/dashboard");
    return {
      ok: `${decoded.summary} Empty identity fields were filled. A draft valuation was attempted from completed sales only.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "VIN decode failed." };
  }
}

export async function createVehicleAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid vehicle." };
  let vehicle;
  try {
    vehicle = await createVehicle(user, parsed.data, correlationId());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save vehicle." };
  }
  revalidatePath("/dashboard");
  redirect(`/vehicles/${vehicle.id}`);
}

export async function saveAcquisitionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = acquisitionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid acquisition." };
  await recordAcquisition(user, parsed.data, correlationId());
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  return {};
}

export async function saveExpenseAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid expense." };
  await recordExpense(user, parsed.data, correlationId());
  revalidatePath(`/vehicles/${parsed.data.vehicleId}`);
  return {};
}

export async function developValuationAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = valuationRequestSchema.safeParse({
    vehicleId: text(formData, "vehicleId"),
    intendedUse: text(formData, "intendedUse"),
    intendedUsers: text(formData, "intendedUsers"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid valuation request." };
  const valuation = await developVehicleValuation(user, parsed.data, correlationId());
  const vehicle = await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId } });
  if (vehicle) await capturePortfolioSnapshot(vehicle.collectionId);
  redirect(`/vehicles/${parsed.data.vehicleId}/valuations/${valuation.id}`);
}

export async function requestAppraisalAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = appraisalRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid appraisal request." };
  const assignment = await requestAppraisal(user, parsed.data, correlationId());
  redirect(`/appraisals/${assignment.id}`);
}

export async function addCredentialAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const parsed = credentialSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    uspapEducationCurrent: formData.get("uspapEducationCurrent") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid credential." };
  await addCredential(user, parsed.data, correlationId());
  revalidatePath("/settings");
  revalidatePath("/lending");
  return { ok: "Credential saved as unverified. An administrator must verify it before it can sign value." };
}

export async function verifyCredentialAction(credentialId: string, status: "VERIFIED" | "REJECTED") {
  const user = await requireUser();
  await verifyCredential(user, credentialId, status, correlationId());
  revalidatePath("/admin");
  revalidatePath("/settings");
}

export async function stampVehicleIdentityAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const vehicleId = text(formData, "vehicleId");
  if (!vehicleId) return { error: "Vehicle is required." };
  try {
    await stampVehicleIdentity(
      user,
      vehicleId,
      { location: text(formData, "location"), notes: text(formData, "notes") },
      correlationId(),
    );
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath("/lending");
    return {
      ok: "Identity stamp recorded. This verifies VIN/identity only. It does not certify market value.",
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to stamp identity." };
  }
}

export async function acceptAssignmentAction(assignmentId: string) {
  const user = await requireUser();
  await acceptAssignment(user, assignmentId, correlationId());
  revalidatePath(`/assignments/${assignmentId}`);
}

export async function recordInspectionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  await recordInspection(
    user,
    {
      assignmentId: text(formData, "assignmentId"),
      type: text(formData, "type") === "PHYSICAL" ? "PHYSICAL" : "REMOTE_DOCUMENTED",
      inspectedAt: text(formData, "inspectedAt"),
      location: text(formData, "location"),
      notes: text(formData, "notes"),
      collectorAcknowledged: formData.get("collectorAcknowledged") === "on",
    },
    correlationId(),
  );
  revalidatePath(`/assignments/${text(formData, "assignmentId")}`);
  return {};
}

export async function draftReportAction(assignmentId: string) {
  const user = await requireUser();
  const report = await buildDraftReport(user, assignmentId, correlationId());
  redirect(`/reports/${report.id}`);
}

export async function signReportAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const reportId = text(formData, "reportId");
  try {
    await signReport(user, reportId, correlationId());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to sign this report." };
  }
  revalidatePath(`/reports/${reportId}`);
  return {};
}

export async function shareReportAction(
  _prev: { error?: string; url?: string } | null,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const user = await requireUser();
  const parsed = shareReportSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid share." };
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await shareReport(user, parsed.data, ip, correlationId());
  revalidatePath(`/reports/${parsed.data.reportId}`);
  return { url: result.url };
}

export async function revokeShareAction(shareId: string, reportId: string) {
  const user = await requireUser();
  await revokeShare(user, shareId, correlationId());
  revalidatePath(`/reports/${reportId}`);
}

export async function lenderDecisionAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = lenderDecisionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid decision." };
  await recordLenderDecision(user, parsed.data, correlationId());
  revalidatePath(`/lender/shares/${text(formData, "token")}`);
  return {};
}

export async function probeOldCarsDataAction(): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  if (!user.memberships.some((item) => item.role === "ADMINISTRATOR")) {
    return { error: "Only administrators can test data-source credentials." };
  }
  const result = await probeOldCarsDataConnection(user.id);
  if (!result.authenticated) {
    return {
      error: result.reason ?? "Old Cars Data is reachable but the API key was not accepted.",
    };
  }
  revalidatePath("/admin");
  return {
    ok: `Connected to ${result.baseUrl}. Public catalog has ${result.makeCount ?? 0} makes. Authenticated completed-sale search succeeded.`,
  };
}

export async function refreshOldCarsDataAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  const make = text(formData, "make");
  const model = text(formData, "model");
  if (!make || !model) return { error: "Make and model are required." };
  const yearMin = text(formData, "yearMin");
  const yearMax = text(formData, "yearMax");
  const result = await refreshFromLiveProvider({
    make,
    model,
    yearMin: yearMin ? Number(yearMin) : undefined,
    yearMax: yearMax ? Number(yearMax) : undefined,
    actorUserId: user.id,
  });
  if (!result.ok) return { error: result.reason };
  revalidatePath("/market");
  revalidatePath("/admin");
  return {
    ok: `Retrieved ${result.imported} new completed sales from ${result.provider}; skipped ${result.skipped} duplicates.`,
  };
}

export async function importMarketJsonAction(
  _prev: { error?: string; ok?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const user = await requireUser();
  if (!user.memberships.some((item) => item.role === "ADMINISTRATOR")) {
    return { error: "Only administrators can import authorized market files." };
  }
  const raw = text(formData, "json");
  try {
    const parsed = JSON.parse(raw) as { data?: OldCarsAuctionRecord[] } | OldCarsAuctionRecord[];
    const result = await importAuthorizedJson(parsed, user.id, correlationId());
    return { ok: `Imported ${result.imported} records; skipped ${result.skipped} duplicates.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}

export async function uploadDocumentAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await requireUser();
  const vehicleId = text(formData, "vehicleId");
  const kind = text(formData, "kind") || "OTHER";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Select a file." };
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { collection: true },
  });
  if (!vehicle) return { error: "Vehicle not found." };
  if (!canMutateCollection(user, vehicle.collection)) return { error: "Not authorized." };
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];
  if (!allowed.includes(file.type)) return { error: "File type is not allowed." };
  if (file.size > 26_214_400) return { error: "File exceeds the 25 MB limit." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const scan = await getMalwareScanner().scan(bytes, file.name);
  const stored = await getDocumentStorage().put(
    `${vehicle.collectionId}/${vehicle.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
    bytes,
    file.type,
  );
  const sensitivity = ["TITLE", "BILL_OF_SALE", "REGISTRATION"].includes(kind)
    ? "SENSITIVE"
    : "STANDARD";
  const doc = await prisma.document.create({
    data: {
      vehicleId,
      uploadedById: user.id,
      kind: kind as never,
      sensitivity,
      fileName: file.name,
      contentType: file.type,
      byteSize: stored.byteSize,
      storageKey: stored.key,
      sha256: stored.sha256,
      malwareScanStatus: scan.status,
      malwareScanAt: scan.scannedAt,
    },
  });
  await writeAudit({
    actorUserId: user.id,
    organizationId: vehicle.collection.organizationId,
    action: "document.uploaded",
    subjectType: "Document",
    subjectId: doc.id,
    newValue: { kind, sha256: stored.sha256, malwareScanStatus: scan.status },
    source: "documents.upload",
    correlationId: correlationId(),
  });
  revalidatePath(`/vehicles/${vehicleId}/documents`);
  return {};
}
