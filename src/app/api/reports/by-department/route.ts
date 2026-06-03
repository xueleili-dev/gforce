import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const _user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const result = await reportService.getDepartmentSummary(year);
  return NextResponse.json(result);
}
