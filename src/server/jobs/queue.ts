import { createHash } from "node:crypto";
import { prisma } from "../db";

export interface JobQueue {
  enqueue(name: string, payload: unknown): Promise<{ id: string; duplicate: boolean }>;
}

export class InlineJobQueue implements JobQueue {
  async enqueue(name: string, payload: unknown) {
    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    try {
      const job = await prisma.importJob.create({
        data: { name, payloadHash, status: "PENDING" },
      });
      return { id: job.id, duplicate: false };
    } catch {
      const existing = await prisma.importJob.findFirst({ where: { name, payloadHash } });
      return { id: existing?.id ?? payloadHash, duplicate: true };
    }
  }
}

export function getJobQueue(): JobQueue {
  return new InlineJobQueue();
}
