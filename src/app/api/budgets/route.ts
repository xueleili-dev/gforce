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
  if (!allowed.includes(user.role)) throw new ForbiddenError("仅管理员和部门负责人可操作");

  const body = await req.json();
  const data = budgetSchema.parse(body);
  const result = await budgetService.createOrUpdate(data);
  return NextResponse.json(result, { status: 201 });
}
