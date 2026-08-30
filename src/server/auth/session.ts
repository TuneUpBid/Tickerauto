import { cookies } from "next/headers";
import { prisma } from "../db";
import { hashToken, randomToken } from "@/domain/hashes";

export const SESSION_COOKIE = "ml_session";
const SESSION_DAYS = 14;

export async function createSession(
  userId: string,
  meta?: { ip?: string | null; userAgent?: string | null },
) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return { token, expiresAt };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: { include: { organization: true } },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.deletedAt) {
    return null;
  }
  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
