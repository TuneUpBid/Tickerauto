import type { UserRole } from "@prisma/client";
import type { CurrentUser } from "./auth/session";

export function hasRole(user: CurrentUser, role: UserRole, organizationId?: string): boolean {
  return user.memberships.some(
    (membership) =>
      membership.status === "ACTIVE" &&
      membership.role === role &&
      (!organizationId || membership.organizationId === organizationId),
  );
}

export function primaryMembership(user: CurrentUser) {
  return (
    user.memberships.find((membership) => membership.status === "ACTIVE") ??
    user.memberships[0] ??
    null
  );
}

export function assertRole(user: CurrentUser, roles: UserRole[], organizationId?: string): void {
  if (!roles.some((role) => hasRole(user, role, organizationId))) {
    throw new Error("Not authorized for this action.");
  }
}

export function canAccessCollection(
  user: CurrentUser,
  collection: { ownerUserId: string; organizationId: string },
): boolean {
  if (hasRole(user, "ADMINISTRATOR")) return true;
  if (collection.ownerUserId === user.id) return true;
  return user.memberships.some(
    (membership) =>
      membership.status === "ACTIVE" && membership.organizationId === collection.organizationId,
  );
}

export function canMutateCollection(
  user: CurrentUser,
  collection: { ownerUserId: string; organizationId: string },
): boolean {
  if (hasRole(user, "ADMINISTRATOR")) return true;
  if (collection.ownerUserId === user.id) return true;
  return hasRole(user, "COLLECTOR", collection.organizationId);
}
