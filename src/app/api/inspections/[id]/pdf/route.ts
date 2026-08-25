import { NextRequest, NextResponse } from "next/server";
import { inspectionService } from "@/services/inspection.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";

// Generate and download the PDF report (admin, dept_head, or owner)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const { pdf, filename } = await inspectionService.generatePdf(params.id, user.id, user.role);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
