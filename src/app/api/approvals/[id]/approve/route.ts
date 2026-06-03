import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  const { comment } = await req.json().catch(() => ({}));
  await approvalService.approve(params.id, user.id, comment);
  return NextResponse.json({ success: true });
}
