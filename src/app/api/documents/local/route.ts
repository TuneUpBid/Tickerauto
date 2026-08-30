import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDocumentStorage, verifyLocalSignature } from "@/server/providers/storage";
import { prisma } from "@/server/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig");
  if (!key || !exp || !sig || !verifyLocalSignature(key, exp, sig)) {
    return NextResponse.json({ error: "Invalid or expired URL" }, { status: 403 });
  }
  const doc = await prisma.document.findFirst({ where: { storageKey: key } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = await getDocumentStorage().read(key);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
