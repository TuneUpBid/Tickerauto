import { prisma } from "./db";

export async function writeAudit(input: {
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  previousValue?: unknown;
  newValue?: unknown;
  source: string;
  correlationId: string;
  reason?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      organizationId: input.organizationId ?? null,
      action: input.action,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      previousValue:
        input.previousValue === undefined ? undefined : (input.previousValue as object),
      newValue: input.newValue === undefined ? undefined : (input.newValue as object),
      source: input.source,
      correlationId: input.correlationId,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      immutable: true,
    },
  });
}
