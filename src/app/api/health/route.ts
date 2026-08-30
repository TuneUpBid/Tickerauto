import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "motorledger" });
  } catch {
    return NextResponse.json({ ok: false, service: "motorledger" }, { status: 503 });
  }
}
