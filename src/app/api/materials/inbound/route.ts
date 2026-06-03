import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  return NextResponse.json(await materialService.listInboundOrders({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
  }));
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const result = await materialService.createInbound({
    items: body.items.map((i: any) => ({
      materialId: i.materialId || undefined,
      name: i.name || undefined,
      quantity: i.quantity,
    })),
    notes: body.notes,
    operatorId: user.id,
  });
  return NextResponse.json(result, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  if (body.action === "cancel" && body.orderId) {
    await materialService.cancelInbound(body.orderId, user.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
