import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const m = await materialService.getMaterial(params.id);
  return NextResponse.json(m);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  const m = await materialService.updateMaterial(params.id, body);
  return NextResponse.json(m);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  try {
    await materialService.deleteMaterial(params.id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: e.statusCode || 500 });
  }
}
