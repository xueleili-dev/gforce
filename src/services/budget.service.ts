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

    if (budgets.length === 0) return [];

    // Single batch query: get actual expenses for ALL relevant budgets at once
    const fiscalYearStart = year ? `${year}-04-01` : `${new Date().getFullYear()}-04-01`;
    const fiscalYearEnd = year ? `${year + 1}-04-01` : `${new Date().getFullYear() + 1}-04-01`;

    // Aggregate all approved+paid expenses by department in one query
    const expenses = await prisma.expense.groupBy({
      by: ["departmentId"],
      where: {
        status: { in: ["approved", "paid"] },
        expenseDate: { gte: new Date(fiscalYearStart), lt: new Date(fiscalYearEnd) },
        departmentId: { in: budgets.map((b) => b.departmentId) },
      },
      _sum: { amount: true },
    });

    const expenseMap = new Map<string, number>();
    for (const e of expenses) {
      expenseMap.set(e.departmentId, e._sum.amount || 0);
    }

    return budgets.map((b) => ({
      ...b,
      actualExpense: expenseMap.get(b.departmentId) || 0,
    }));
  }

  // Increment budget (default — adds to existing total)
  async createOrUpdate(data: { year: number; departmentId: string; totalAmount: number }) {
    const existing = await prisma.budget.findUnique({
      where: { year_departmentId: { year: data.year, departmentId: data.departmentId } },
    });

    if (existing) {
      return prisma.budget.update({
        where: { id: existing.id },
        data: { totalAmount: { increment: data.totalAmount } },
      });
    }

    return prisma.budget.create({ data });
  }

  // Set exact budget amount (for correction)
  async set(data: { year: number; departmentId: string; totalAmount: number }) {
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
