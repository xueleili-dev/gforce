import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.getOutboundOrder(params.id));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  if (body.action === "cancel") {
    await materialService.cancelOutbound(params.id, user.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
