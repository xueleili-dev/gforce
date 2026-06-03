import { prisma } from "@/lib/prisma";

// Fiscal year: April to next March. Index 0 = April, 11 = March.
function fiscalMonth(date: Date): number {
  return (date.getMonth() - 3 + 12) % 12;
}

function buildMonthlyArray(expenses: { amount: number; expenseDate: Date }[]) {
  const months = Array(12).fill(0);
  for (const e of expenses) {
    months[fiscalMonth(e.expenseDate)] += Number(e.amount);
  }
  return months.map((amt) => Math.round(amt * 100) / 100);
}

export class ReportService {
  async getPersonalSummary(userId: string, year: number) {
    const expenses = await prisma.expense.findMany({
      where: { applicantId: userId, status: { in: ["approved", "paid"] }, expenseDate: { gte: new Date(`${year}-04-01`), lt: new Date(`${year + 1}-04-01`) } },
    });

    const totalAmount = Math.round(expenses.reduce((sum, e) => sum + Number(e.amount), 0) * 100) / 100;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const e of expenses) {
      byType[e.type] = Math.round(((byType[e.type] || 0) + Number(e.amount)) * 100) / 100;
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    return {
      totalAmount,
      count: expenses.length,
      byType,
      byStatus,
      monthlyBreakdown: buildMonthlyArray(expenses.map((e) => ({ amount: Number(e.amount), expenseDate: e.expenseDate }))),
    };
  }

  async getAllPersonalSummaries(year: number) {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, department: { select: { name: true } } },
    });

    const expenses = await prisma.expense.findMany({
      where: { status: { in: ["approved", "paid"] }, expenseDate: { gte: new Date(`${year}-04-01`), lt: new Date(`${year + 1}-04-01`) } },
      select: { amount: true, expenseDate: true, applicantId: true },
    });

    // 按申请人分组
    const byUser: Record<string, { amount: number; expenseDate: Date }[]> = {};
    for (const e of expenses) {
      if (!byUser[e.applicantId]) byUser[e.applicantId] = [];
      byUser[e.applicantId].push({ amount: Number(e.amount), expenseDate: e.expenseDate });
    }

    return users
      .filter((u) => byUser[u.id])
      .map((u) => {
        const userExpenses = byUser[u.id];
        const totalAmount = Math.round(userExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
        return {
          userId: u.id,
          userName: u.name,
          departmentName: u.department.name,
          totalAmount,
          count: userExpenses.length,
          monthlyBreakdown: buildMonthlyArray(userExpenses),
        };
      })
      .filter((u) => u.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getDepartmentSummary(year: number) {
    const departments = await prisma.department.findMany({
      include: {
        budgets: { where: { year } },
        expenses: { where: { status: { in: ["approved", "paid"] }, expenseDate: { gte: new Date(`${year}-04-01`), lt: new Date(`${year + 1}-04-01`) } } },
      },
    });

    return departments.map((d) => {
      const totalExpense = Math.round(d.expenses.reduce((sum, e) => sum + Number(e.amount), 0) * 100) / 100;
      const budgetTotal = Math.round(d.budgets.reduce((sum, b) => sum + Number(b.totalAmount), 0) * 100) / 100;

      return {
        departmentId: d.id,
        departmentName: d.name,
        totalExpense,
        budgetTotal,
        budgetUsed: totalExpense,
        remaining: Math.round((budgetTotal - totalExpense) * 100) / 100,
        expenseCount: d.expenses.length,
        monthlyExpenses: buildMonthlyArray(d.expenses.map((e) => ({ amount: Number(e.amount), expenseDate: e.expenseDate }))),
      };
    });
  }

  async getCompanyOverview(year: number) {
    const budgets = await prisma.budget.findMany({ where: { year } });
    const totalBudget = Math.round(budgets.reduce((sum, b) => sum + Number(b.totalAmount), 0) * 100) / 100;
    const totalUsed = Math.round(budgets.reduce((sum, b) => sum + Number(b.usedAmount), 0) * 100) / 100;

    // Monthly breakdown across all departments
    const expenses = await prisma.expense.findMany({
      where: { status: { in: ["approved", "paid"] }, expenseDate: { gte: new Date(`${year}-04-01`), lt: new Date(`${year + 1}-04-01`) } },
      select: { amount: true, expenseDate: true },
    });
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthlyExpenses = buildMonthlyArray(expenses.map((e) => ({ amount: Number(e.amount), expenseDate: e.expenseDate })));

    return {
      year,
      totalBudget,
      totalUsed: Math.round(totalExpense * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      remaining: Math.round((totalBudget - totalExpense) * 100) / 100,
      monthlyExpenses,
    };
  }
}

export const reportService = new ReportService();
