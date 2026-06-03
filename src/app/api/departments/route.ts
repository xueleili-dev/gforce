import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function GET() {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      head: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  await requireRole(["admin"]);
  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "部门名称不能为空" }, { status: 400 });
  }
  const dept = await prisma.department.create({ data: { name: name.trim() } });
  return NextResponse.json(dept, { status: 201 });
}
