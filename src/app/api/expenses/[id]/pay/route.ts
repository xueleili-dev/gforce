import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  await approvalService.markAsPaid(params.id, user.id);
  return NextResponse.json({ success: true });
}
