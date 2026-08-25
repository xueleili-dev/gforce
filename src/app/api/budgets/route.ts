import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/services/budget.service";
import { requireAuth } from "@/lib/auth-helpers";
import { budgetSchema } from "@/lib/validation";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const list = await budgetService.list(year, departmentId);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const allowed = ["admin", "dept_head"];
  if (!allowed.includes(user.role)) throw new ForbiddenError("Only admin and dept_head can manage budgets");

  const body = await req.json();
  const data = budgetSchema.parse(body);
  const action = new URL(req.url).searchParams.get("action");
  const result = action === "set"
    ? await budgetService.set(data)
    : await budgetService.createOrUpdate(data);
  return NextResponse.json(result, { status: 201 });
}
