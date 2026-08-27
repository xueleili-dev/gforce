import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  await requireAuth();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEngineer: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      managerId: true,
    },
  });
  return NextResponse.json(users);
}
