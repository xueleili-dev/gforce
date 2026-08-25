import { NextRequest, NextResponse } from "next/server";
import { inspectionService } from "@/services/inspection.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    await requireAuth();
    const checklist = await inspectionService.listChecklist();
    return NextResponse.json(checklist);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "dept_head") throw new AppError(403, "FORBIDDEN", "Admin only");

    const body = await req.json();
    // body.type = "section" | "item"
    if (body.type === "section") {
      const section = await inspectionService.createSection({ title: body.title, order: body.order });
      return NextResponse.json(section, { status: 201 });
    } else if (body.type === "item") {
      const item = await inspectionService.createItem(body.sectionId, { code: body.code, title: body.title, order: body.order });
      return NextResponse.json(item, { status: 201 });
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "dept_head") throw new AppError(403, "FORBIDDEN", "Admin only");

    const body = await req.json();
    if (body.type === "section") {
      const section = await inspectionService.updateSection(body.id, { title: body.title, order: body.order });
      return NextResponse.json(section);
    } else if (body.type === "item") {
      const item = await inspectionService.updateItem(body.id, { code: body.code, title: body.title, order: body.order });
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin" && user.role !== "dept_head") throw new AppError(403, "FORBIDDEN", "Admin only");

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (type === "section") {
      await inspectionService.deleteSection(id);
    } else if (type === "item") {
      await inspectionService.deleteItem(id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
