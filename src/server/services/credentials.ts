import { catalogEntry } from "@/domain/credentials";
import type { CredentialInput } from "@/lib/validation";
import { writeAudit } from "../audit";
import { prisma } from "../db";
import { hasRole } from "../rbac";
import type { CurrentUser } from "../auth/session";

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function addCredential(
  user: CurrentUser,
  input: CredentialInput,
  correlationId: string,
) {
  const catalog = catalogEntry(input.credentialType);
  const credential = await prisma.appraiserCredential.create({
    data: {
      userId: user.id,
      organization: input.organization,
      credentialType: input.credentialType,
      authority: catalog.authority,
      jurisdiction: emptyToNull(input.jurisdiction),
      specialty: emptyToNull(input.specialty),
      credentialNumber: emptyToNull(input.credentialNumber),
      issuedOn: input.issuedOn ? new Date(input.issuedOn) : null,
      expiresOn: input.expiresOn ? new Date(input.expiresOn) : null,
      uspapEducationCurrent: Boolean(input.uspapEducationCurrent),
      uspapEducationThrough: input.uspapEducationThrough
        ? new Date(input.uspapEducationThrough)
        : null,
      verificationStatus: "UNVERIFIED",
      notes: emptyToNull(input.notes),
    },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "credential.added",
    subjectType: "AppraiserCredential",
    subjectId: credential.id,
    newValue: { type: credential.credentialType, authority: credential.authority },
    source: "credentials.add",
    correlationId,
  });
  return credential;
}

export async function verifyCredential(
  user: CurrentUser,
  credentialId: string,
  status: "VERIFIED" | "REJECTED",
  correlationId: string,
) {
  if (!hasRole(user, "ADMINISTRATOR")) {
    throw new Error("Only an administrator can verify a credential.");
  }
  const credential = await prisma.appraiserCredential.update({
    where: { id: credentialId },
    data: { verificationStatus: status },
  });
  await writeAudit({
    actorUserId: user.id,
    action: "credential.verified",
    subjectType: "AppraiserCredential",
    subjectId: credential.id,
    newValue: { status },
    source: "credentials.verify",
    correlationId,
    reason: "Administrator verification. Software does not invent credential status.",
  });
  return credential;
}
