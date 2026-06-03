import { prisma } from "@/lib/prisma";

export class BudgetService {
  async list(year?: number, departmentId?: string) {
    const where: any = {};
    if (year) where.year = year;
    if (departmentId) where.departmentId = departmentId;

    const budgets = await prisma.budget.findMany({
      where,
      include: { department: { select: { name: true } } },
      orderBy: { year: "desc" },
    });

    // 计算每个预算的实际支出（排除草稿和驳回）
    const result = await Promise.all(
      budgets.map(async (b) => {
        const expenses = await prisma.expense.aggregate({
          where: {
            departmentId: b.departmentId,
            status: { in: ["approved", "paid"] },
            expenseDate: { gte: new Date(`${b.year}-04-01`), lt: new Date(`${b.year + 1}-04-01`) },
          },
          _sum: { amount: true },
        });
        return { ...b, actualExpense: expenses._sum.amount || 0 };
      }),
    );

    return result;
  }

  async createOrUpdate(data: { year: number; departmentId: string; totalAmount: number }) {
    const existing = await prisma.budget.findUnique({
      where: { year_departmentId: { year: data.year, departmentId: data.departmentId } },
    });

    if (existing) {
      return prisma.budget.update({
        where: { id: existing.id },
        data: { totalAmount: data.totalAmount },
      });
    }

    return prisma.budget.create({ data });
  }

  async getByYear(year: number, departmentId: string) {
    return prisma.budget.findUnique({
      where: { year_departmentId: { year, departmentId } },
    });
  }
}

export const budgetService = new BudgetService();
