import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { BadRequestError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const expenseId = formData.get("expenseId") as string | null;

    if (!file) throw new BadRequestError("未上传文件");
    if (!ALLOWED_TYPES.includes(file.type)) throw new BadRequestError("仅支持 jpg/png/pdf");
    if (file.size > MAX_SIZE) throw new BadRequestError("文件不能超过 10MB");

    const ext = path.extname(file.name);
    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, filename);

    // Ensure the uploads directory exists (it is gitignored and may be absent
    // on a fresh clone / CI runner).
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const attachmentData = {
      url: `/uploads/${filename}`,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    };

    // If expenseId provided, create Attachment record directly
    if (expenseId) {
      const attachment = await prisma.attachment.create({
        data: { ...attachmentData, expenseId },
      });
      return NextResponse.json({ id: attachment.id, ...attachmentData });
    }

    return NextResponse.json(attachmentData);
  } catch (err) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode });
    }
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "服务器错误" } }, { status: 500 });
  }
}
