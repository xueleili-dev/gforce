import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approvalService } from "@/services/approval.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const role: string = user.role || "employee";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [myMonthCount, myMonthAgg, pendingCount, pendingPaymentCount, recentExpenses] =
    await Promise.all([
      prisma.expense.count({
        where: { applicantId: user.id, createdAt: { gte: monthStart } },
      }),
      prisma.expense.aggregate({
        where: { applicantId: user.id, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      ["manager", "dept_head", "finance"].includes(role)
        ? approvalService.countPending(user.id)
        : Promise.resolve(0),
      role === "finance"
        ? prisma.expense.count({ where: { status: "approved" } })
        : Promise.resolve(0),
      prisma.expense.findMany({
        where: { applicantId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, amount: true, status: true, expenseDate: true },
      }),
    ]);

  return NextResponse.json({
    myMonthCount,
    myMonthTotal: Number(myMonthAgg._sum.amount) || 0,
    pendingCount,
    pendingPaymentCount,
    recentExpenses,
  });
}
