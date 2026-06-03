import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!["admin", "dept_head"].includes(user.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.updateCategory(params.id, body));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (!["admin", "dept_head"].includes(user.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await materialService.deleteCategory(params.id);
  return NextResponse.json({ success: true });
}
