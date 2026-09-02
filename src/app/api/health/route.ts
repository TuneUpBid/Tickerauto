import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "tickerauto" });
  } catch {
    return NextResponse.json({ ok: false, service: "tickerauto" }, { status: 503 });
  }
}
