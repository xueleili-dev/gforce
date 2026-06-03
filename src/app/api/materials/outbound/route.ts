import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  // Check if requesting historical projects
  if (searchParams.get("projects") === "1") {
    const projects = await materialService.getHistoricalProjects();
    return NextResponse.json(projects);
  }
  return NextResponse.json(await materialService.listOutboundOrders({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    customerId: searchParams.get("customerId") || undefined,
    materialName: searchParams.get("materialName") || undefined,
    project: searchParams.get("project") || undefined,
  }));
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const result = await materialService.createOutbound({
    customerId: body.customerId,
    project: body.project || "",
    items: body.items,
    operatorId: user.id,
  });
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  if (searchParams.get("action") === "deleteOrders") {
    const count = await materialService.clearOutboundOrdersByDateRange(startDate, endDate);
    return NextResponse.json({ deleted: count });
  }
  const count = await materialService.clearProjectsByDateRange(startDate, endDate);
  return NextResponse.json({ cleared: count });
}
