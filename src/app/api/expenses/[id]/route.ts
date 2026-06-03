import { NextRequest, NextResponse } from "next/server";
import { expenseService } from "@/services/expense.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const result = await expenseService.getById(params.id, user.id, user.role);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (body.action === "withdraw") {
      await expenseService.withdraw(params.id, user.id);
      return NextResponse.json({ success: true });
    }

    const result = await expenseService.update(params.id, user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await expenseService.delete(params.id, user.id);
    return NextResponse.json({ success: true });
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
