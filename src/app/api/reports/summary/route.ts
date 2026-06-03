import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const result = await reportService.getPersonalSummary(user.id, year);
  return NextResponse.json(result);
}
