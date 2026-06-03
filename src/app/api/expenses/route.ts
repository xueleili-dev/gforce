import { NextRequest, NextResponse } from "next/server";
import { expenseService } from "@/services/expense.service";
import { requireAuth } from "@/lib/auth-helpers";
import { expenseSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("projects") === "1") {
      const projects = await expenseService.getHistoricalProjects();
      return NextResponse.json(projects);
    }
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const minAmount = searchParams.get("minAmount") ? parseFloat(searchParams.get("minAmount")!) : undefined;
    const maxAmount = searchParams.get("maxAmount") ? parseFloat(searchParams.get("maxAmount")!) : undefined;

    const result = await expenseService.list({
      userId: user.id, role: user.role, status, page, pageSize,
      search, startDate, endDate, minAmount, maxAmount,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const count = await expenseService.clearAllExpenses();
    return NextResponse.json({ deleted: count });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const isDraft = body.isDraft === true;

    const data = expenseSchema.parse(body);
    const result = await expenseService.create({
      ...data, userId: user.id, departmentId: user.departmentId, isDraft,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: err.issues[0].message } }, { status: 400 });
  }
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, { status: 500 });
}
