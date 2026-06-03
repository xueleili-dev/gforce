import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  await requireRole(["admin"]);
  const body = await req.json();
  const user = await authService.register(body);
  return NextResponse.json(user, { status: 201 });
}
