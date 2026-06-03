import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(["admin"]);
  const body = await req.json();

  const dept = await prisma.department.findUnique({ where: { id: params.id } });
  if (!dept) return NextResponse.json({ error: "部门不存在" }, { status: 404 });

  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.headId !== undefined) updateData.headId = body.headId || null;

  await prisma.department.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(["admin"]);

  const dept = await prisma.department.findUnique({ where: { id: params.id } });
  if (!dept) return NextResponse.json({ error: "部门不存在" }, { status: 404 });

  const [userCount, expenseCount, budgetCount] = await Promise.all([
    prisma.user.count({ where: { departmentId: params.id } }),
    prisma.expense.count({ where: { departmentId: params.id } }),
    prisma.budget.count({ where: { departmentId: params.id } }),
  ]);

  if (userCount > 0) {
    return NextResponse.json({ error: "该部门下还有用户，请先将用户移至其他部门" }, { status: 400 });
  }
  if (expenseCount > 0) {
    return NextResponse.json({ error: "该部门下还有费用记录，无法删除" }, { status: 400 });
  }

  // cascade delete budgets
  await prisma.budget.deleteMany({ where: { departmentId: params.id } });
  await prisma.department.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
