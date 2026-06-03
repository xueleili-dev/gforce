import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`);
  const list = await reportService.getAllPersonalSummaries(year);
  return NextResponse.json(list);
}
