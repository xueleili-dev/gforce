import { NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireAuth();
  const count = await approvalService.countPending(user.id);
  return NextResponse.json({ count });
}
