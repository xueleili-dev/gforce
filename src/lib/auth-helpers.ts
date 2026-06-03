import { auth } from "@/lib/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user as { id: string; name: string; email: string; role: string; departmentId: string };
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError("Access denied");
  }
  return user;
}
