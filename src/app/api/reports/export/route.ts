import { NextRequest } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";
import { csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const type = searchParams.get("type") || "department";

  if (type === "personal") {
    const data = await reportService.getAllPersonalSummaries(year);
    const rows = data.map((u) => ({
      "Name": u.userName,
      "Department": u.departmentName,
      "Apr": u.monthlyBreakdown[0],
      "May": u.monthlyBreakdown[1],
      "Jun": u.monthlyBreakdown[2],
      "Jul": u.monthlyBreakdown[3],
      "Aug": u.monthlyBreakdown[4],
      "Sep": u.monthlyBreakdown[5],
      "Oct": u.monthlyBreakdown[6],
      "Nov": u.monthlyBreakdown[7],
      "Dec": u.monthlyBreakdown[8],
      "Jan": u.monthlyBreakdown[9],
      "Feb": u.monthlyBreakdown[10],
      "Mar": u.monthlyBreakdown[11],
      "Annual Total": u.totalAmount,
      "Count": u.count,
    }));
    return csvResponse(rows, `personal_expenses_${year}.csv`);
  }

  const data = await reportService.getDepartmentSummary(year);
  const rows = data.map((d) => ({
    "Department": d.departmentName,
    "Apr": d.monthlyExpenses[0],
    "May": d.monthlyExpenses[1],
    "Jun": d.monthlyExpenses[2],
    "Jul": d.monthlyExpenses[3],
    "Aug": d.monthlyExpenses[4],
    "Sep": d.monthlyExpenses[5],
    "Oct": d.monthlyExpenses[6],
    "Nov": d.monthlyExpenses[7],
    "Dec": d.monthlyExpenses[8],
    "Jan": d.monthlyExpenses[9],
    "Feb": d.monthlyExpenses[10],
    "Mar": d.monthlyExpenses[11],
    "Annual Total": d.totalExpense,
    "Budget": d.budgetTotal,
    "Remaining": d.remaining,
    "Count": d.expenseCount,
  }));
  return csvResponse(rows, `department_expenses_${year}.csv`);
}
