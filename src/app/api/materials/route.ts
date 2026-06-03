import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const categoryId = searchParams.get("categoryId") || undefined;

  const materials = await materialService.listMaterials({ search, categoryId });
  return NextResponse.json(materials.map((m) => ({
    id: m.id,
    name: m.name,
    categoryId: m.categoryId,
    categoryName: m.category.name,
    spec: m.spec,
    unit: m.unit,
    safetyStock: m.safetyStock,
    currentStock: m.currentStock,
    createdAt: m.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const material = await materialService.createMaterial(body);
  return NextResponse.json(material, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
  const count = await materialService.deleteMaterialsByDateRange(startDate, endDate);
  return NextResponse.json({ deleted: count });
}
