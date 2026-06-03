import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.listCustomers());
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!["admin", "dept_head"].includes(user.role)) return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  const c = await materialService.createCustomer(body);
  return NextResponse.json(c, { status: 201 });
}
