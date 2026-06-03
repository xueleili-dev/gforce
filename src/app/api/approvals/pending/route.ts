import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest) {
  const user = await requireAuth();
  const list = await approvalService.getPending(user.id);
  return NextResponse.json(list);
}
