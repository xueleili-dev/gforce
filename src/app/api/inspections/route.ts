import { NextRequest, NextResponse } from "next/server";
import { inspectionService } from "@/services/inspection.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    const reports = await inspectionService.listReports(user.id, user.role);
    return NextResponse.json(reports);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const report = await inspectionService.createReport(user.id, body);
    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
