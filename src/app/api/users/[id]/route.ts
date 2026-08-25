import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole(["admin"]);
  const body = await req.json();

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.password) updateData.passwordHash = await bcrypt.hash(body.password, 12);
  if (body.departmentId) updateData.departmentId = body.departmentId;
  if (body.role) updateData.role = body.role;
  if (body.managerId !== undefined) updateData.managerId = body.managerId || null;
  if (body.isEngineer !== undefined) updateData.isEngineer = body.isEngineer;

  await prisma.user.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireRole(["admin"]);

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  if (user.id === session.id) {
    return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
  }

  // Check for related records before deleting
  const [expenseCount, approvalCount, managedDept] = await Promise.all([
    prisma.expense.count({ where: { applicantId: params.id } }),
    prisma.approvalRecord.count({ where: { approverId: params.id } }),
    prisma.department.findFirst({ where: { headId: params.id } }),
  ]);

  if (expenseCount > 0 || approvalCount > 0) {
    return NextResponse.json(
      { error: `无法删除：该用户有 ${expenseCount} 条费用申请和 ${approvalCount} 条审批记录，请先处理关联数据` },
      { status: 400 }
    );
  }

  if (managedDept) {
    return NextResponse.json(
      { error: `无法删除：该用户是「${managedDept.name}」的负责人，请先更换部门负责人` },
      { status: 400 }
    );
  }

  // Clear manager reference from subordinates before deletion
  await prisma.user.updateMany({
    where: { managerId: params.id },
    data: { managerId: null },
  });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
