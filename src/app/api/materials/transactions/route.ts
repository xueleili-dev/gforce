import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const data = await materialService.listTransactions({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "30"),
    type: searchParams.get("type") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    materialId: searchParams.get("materialId") || undefined,
    customerId: searchParams.get("customerId") || undefined,
    project: searchParams.get("project") || undefined,
  });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  const count = await materialService.clearTransactionsByDateRange(startDate, endDate);
  return NextResponse.json({ deleted: count });
}
