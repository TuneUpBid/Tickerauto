"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, hashToken, randomToken, verifyPassword } from "@/domain/hashes";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { writeAudit } from "../audit";
import { getConfig } from "../config";
import { prisma } from "../db";
import { getEmailProvider } from "../providers/email";
import { clientKey, rateLimit } from "../rate-limit";
import { correlationId } from "@/lib/utils";
import { createSession, destroySession } from "../auth/session";

function formString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

async function ipAddress(): Promise<string | null> {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip");
}

export async function registerAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const ip = await ipAddress();
  const limited = rateLimit(clientKey("register", ip), getConfig().rateLimit.authPerMinute);
  if (!limited.ok) return { error: "Too many registration attempts. Try again shortly." };

  const parsed = registerSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
    organizationName: formString(formData, "organizationName"),
    acceptDisclosures: formData.get("acceptDisclosures") === "on" ? true : false,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid registration." };

  const emailNormalized = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { emailNormalized } });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);
  const corr = correlationId();
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: parsed.data.email.trim(),
        emailNormalized,
        passwordHash,
        name: parsed.data.name,
        displayName: parsed.data.name,
      },
    });
    const org = await tx.organization.create({
      data: { name: parsed.data.organizationName, type: "COLLECTOR" },
    });
    await tx.membership.create({
      data: { userId: created.id, organizationId: org.id, role: "COLLECTOR", status: "ACTIVE" },
    });
    await tx.collection.create({
      data: {
        organizationId: org.id,
        ownerUserId: created.id,
        name: `${parsed.data.organizationName} collection`,
      },
    });
    return created;
  });

  const token = randomToken(24);
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      purpose: "verify_email",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const verifyUrl = `${getConfig().baseUrl}/verify-email?token=${token}`;
  await getEmailProvider().send({
    to: user.email,
    subject: "Verify your MotorLedger email",
    text: `Verify your email by opening: ${verifyUrl}\nThis link expires in 24 hours.`,
  });
  await writeAudit({
    actorUserId: user.id,
    action: "user.registered",
    subjectType: "User",
    subjectId: user.id,
    source: "auth.register",
    correlationId: corr,
    ipAddress: ip,
  });
  redirect(`/verify-email?sent=1&email=${encodeURIComponent(user.email)}`);
}

export async function verifyEmailAction(token: string): Promise<{ error?: string; ok?: boolean }> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.purpose !== "verify_email" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return { error: "This verification link is invalid or expired." };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await writeAudit({
    actorUserId: record.userId,
    action: "user.email_verified",
    subjectType: "User",
    subjectId: record.userId,
    source: "auth.verify",
    correlationId: correlationId(),
  });
  return { ok: true };
}

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const ip = await ipAddress();
  const limited = rateLimit(clientKey("login", ip), getConfig().rateLimit.authPerMinute);
  if (!limited.ok) return { error: "Too many sign-in attempts. Try again shortly." };

  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await prisma.user.findUnique({
    where: { emailNormalized: parsed.data.email.trim().toLowerCase() },
  });
  if (!user || user.deletedAt) return { error: "Email or password is incorrect." };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "This account is temporarily locked after failed sign-in attempts." };
  }
  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil: failed >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
    return { error: "Email or password is incorrect." };
  }
  if (!user.emailVerifiedAt) {
    return {
      error: "Verify your email before signing in. Check your inbox or the development console.",
    };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null },
  });
  await createSession(user.id, { ip });
  await writeAudit({
    actorUserId: user.id,
    action: "user.login",
    subjectType: "User",
    subjectId: user.id,
    source: "auth.login",
    correlationId: correlationId(),
    ipAddress: ip,
  });
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const ip = await ipAddress();
  const limited = rateLimit(clientKey("forgot", ip), getConfig().rateLimit.authPerMinute);
  if (!limited.ok) return { error: "Too many reset requests. Try again shortly." };
  const parsed = forgotPasswordSchema.safeParse({ email: formString(formData, "email") });
  if (!parsed.success) return { error: "Enter a valid email." };
  const user = await prisma.user.findUnique({
    where: { emailNormalized: parsed.data.email.trim().toLowerCase() },
  });
  if (user) {
    const token = randomToken(24);
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        purpose: "reset_password",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await getEmailProvider().send({
      to: user.email,
      subject: "Reset your MotorLedger password",
      text: `Reset your password: ${getConfig().baseUrl}/reset-password?token=${token}`,
    });
  }
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = resetPasswordSchema.safeParse({
    token: formString(formData, "token"),
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid reset request." };
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (
    !record ||
    record.purpose !== "reset_password" ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return { error: "This reset link is invalid or expired." };
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        failedLogins: 0,
        lockedUntil: null,
      },
    }),
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  redirect("/login?reset=1");
}
