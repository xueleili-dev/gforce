import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/services/notification.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const countOnly = searchParams.get("count") === "true";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "30");

  if (countOnly) {
    const count = await notificationService.countUnread(user.id);
    return NextResponse.json({ count });
  }

  const result = await notificationService.list(user.id, page, pageSize);
  return NextResponse.json(result);
}

export async function PATCH() {
  const user = await requireAuth();
  await notificationService.markAllRead(user.id);
  return NextResponse.json({ success: true });
}
