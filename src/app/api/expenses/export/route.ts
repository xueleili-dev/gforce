import { NextRequest } from "next/server";
import { expenseService } from "@/services/expense.service";
import { requireAuth } from "@/lib/auth-helpers";
import { csvResponse } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const result = await expenseService.list({
    userId: user.id,
    role: user.role,
    status,
    page: 1,
    pageSize: 9999,
  });

  const rows = result.items.map((item) => ({
    "Title": item.title,
    "Type": item.type,
    "Amount": item.amount,
    "Status": item.status,
    "Applicant": item.applicantName,
    "Department": item.departmentName,
    "Date": item.expenseDate,
    "Created At": item.createdAt,
  }));

  return csvResponse(rows, `expenses_${new Date().toISOString().split("T")[0]}.csv`);
}
