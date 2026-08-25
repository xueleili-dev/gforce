import { NextRequest, NextResponse } from "next/server";
import { inspectionService } from "@/services/inspection.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const report = await inspectionService.getReport(params.id, user.id, user.role);
    return NextResponse.json(report);
  } catch (err) {
    return handleError(err);
  }
}

// Save results or images
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (body.action === "saveResults") {
      await inspectionService.saveResults(params.id, user.id, user.role, body.results);
      return NextResponse.json({ success: true });
    }
    if (body.action === "saveImages") {
      await inspectionService.saveImages(params.id, user.id, user.role, body.images);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

// Submit (mark as submitted, no PDF)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await inspectionService.submit(params.id, user.id, user.role);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

// Delete a report (admin, dept_head, or owner)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await inspectionService.deleteReport(params.id, user.id, user.role);
    return NextResponse.json({ success: true });
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
