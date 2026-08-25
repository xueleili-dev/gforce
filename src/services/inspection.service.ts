import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { renderToBuffer } from "@react-pdf/renderer";
import { InspectionPDF } from "@/lib/pdf/inspection-pdf";
import path from "path";
import fs from "fs";

// Read an uploaded image and return a data URI so @react-pdf/renderer can embed it
// (passing a raw file path/URL makes it attempt a fetch, which fails server-side).
function imageToDataUri(url: string): string {
  if (!url) return "";
  if (url.startsWith("data:")) return url;
  const absPath = url.startsWith("/uploads/")
    ? path.join(process.cwd(), "public", url)
    : url;
  try {
    const data = fs.readFileSync(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const mime =
      ext === ".png" ? "image/png"
      : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".webp" ? "image/webp"
      : ext === ".gif" ? "image/gif"
      : "image/png";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return url;
  }
}

export class InspectionService {
  // ── Checklist (admin CRUD) ──

  async listChecklist() {
    return prisma.inspectionSection.findMany({
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });
  }

  async createSection(data: { title: string; order?: number }) {
    const maxOrder = await prisma.inspectionSection.aggregate({ _max: { order: true } });
    return prisma.inspectionSection.create({
      data: { title: data.title, order: data.order ?? (maxOrder._max.order || 0) + 1 },
    });
  }

  async updateSection(id: string, data: { title?: string; order?: number }) {
    return prisma.inspectionSection.update({ where: { id }, data });
  }

  async deleteSection(id: string) {
    await prisma.inspectionSection.delete({ where: { id } });
  }

  async createItem(sectionId: string, data: { code: string; title: string; order?: number }) {
    const maxOrder = await prisma.inspectionItem.aggregate({ where: { sectionId }, _max: { order: true } });
    return prisma.inspectionItem.create({
      data: { sectionId, code: data.code, title: data.title, order: data.order ?? (maxOrder._max.order || 0) + 1 },
    });
  }

  async updateItem(id: string, data: { code?: string; title?: string; order?: number }) {
    return prisma.inspectionItem.update({ where: { id }, data });
  }

  async deleteItem(id: string) {
    await prisma.inspectionItem.delete({ where: { id } });
  }

  // ── Reports (engineers create; admin + dept_head manage all) ──

  async listReports(userId: string, role: string) {
    const where: any = {};
    if (role !== "admin" && role !== "dept_head" && role !== "manager") where.staffId = userId;
    return prisma.inspectionReport.findMany({
      where,
      include: { _count: { select: { results: true, images: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createReport(userId: string, data: {
    siteName: string; region: string; typeOfStructure: string;
    heightOfTower: string; inspectionDate: string; staffName: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== "admin" && user.role !== "dept_head" && !user.isEngineer) {
      throw new ForbiddenError("Only engineers can create inspections");
    }

    return prisma.inspectionReport.create({
      data: {
        ...data,
        inspectionDate: new Date(data.inspectionDate),
        staffId: userId,
        email: "xuelei.li@gmail.com",
      },
    });
  }

  async getReport(id: string, userId: string, role: string) {
    const report = await prisma.inspectionReport.findUnique({
      where: { id },
      include: {
        results: { include: { item: { include: { section: true } } } },
        images: true,
      },
    });
    if (!report) throw new NotFoundError("Inspection report not found");
    if (role !== "admin" && role !== "dept_head" && role !== "manager" && report.staffId !== userId) {
      throw new ForbiddenError("Access denied");
    }
    return report;
  }

  async deleteReport(reportId: string, userId: string, role: string) {
    const report = await prisma.inspectionReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Report not found");
    if (role !== "admin" && role !== "dept_head" && role !== "manager" && report.staffId !== userId) {
      throw new ForbiddenError("Access denied");
    }
    // Results and images cascade-delete via schema onDelete: Cascade
    await prisma.inspectionReport.delete({ where: { id: reportId } });
  }

  // ── Results ──

  async saveResults(reportId: string, userId: string, role: string, results: { itemId: string; grade: string; comment: string }[]) {
    const report = await prisma.inspectionReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Report not found");
    if (role !== "admin" && role !== "dept_head" && report.staffId !== userId) throw new ForbiddenError("Access denied");

    await prisma.$transaction(async (tx) => {
      // Validate all first
      for (const r of results) {
        const grade = r.grade.toUpperCase();
        if (!["A", "B", "C"].includes(grade)) throw new ConflictError("Invalid grade");
        if ((grade === "B" || grade === "C") && !r.comment?.trim()) {
          throw new ConflictError("Comment required for grade B or C");
        }
      }
      // Delete existing results and recreate
      await tx.inspectionResult.deleteMany({ where: { reportId } });
      await tx.inspectionResult.createMany({
        data: results.map((r) => ({
          reportId,
          itemId: r.itemId,
          grade: r.grade.toUpperCase(),
          comment: r.comment?.trim() || "",
        })),
      });
    });
  }

  async saveImages(reportId: string, userId: string, role: string, images: { beforeImage: string; afterImage: string; description: string }[]) {
    const report = await prisma.inspectionReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Report not found");
    if (role !== "admin" && role !== "dept_head" && report.staffId !== userId) throw new ForbiddenError("Access denied");

    await prisma.$transaction(async (tx) => {
      await tx.inspectionImage.deleteMany({ where: { reportId } });
      if (images.length > 0) {
        await tx.inspectionImage.createMany({
          data: images.map((img) => ({ reportId, ...img })),
        });
      }
    });
  }

  // ── Submit: mark as submitted (no PDF generation) ──

  async submit(reportId: string, userId: string, role: string) {
    const report = await prisma.inspectionReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Report not found");
    if (role !== "admin" && role !== "dept_head" && report.staffId !== userId) throw new ForbiddenError("Access denied");

    await prisma.inspectionReport.update({
      where: { id: reportId },
      data: { status: "submitted" },
    });

    return { success: true };
  }

  // ── Generate PDF (download) ──

  async generatePdf(reportId: string, userId: string, role: string) {
    const report = await prisma.inspectionReport.findUnique({
      where: { id: reportId },
      include: {
        results: { include: { item: { include: { section: true } } } },
        images: true,
      },
    });
    if (!report) throw new NotFoundError("Report not found");
    if (role !== "admin" && role !== "dept_head" && report.staffId !== userId) throw new ForbiddenError("Access denied");

    // Build checklist data for PDF
    const checklist = report.results.map((r) => ({
      section: r.item.section.title,
      code: r.item.code,
      title: r.item.title,
      grade: r.grade,
      comment: r.comment,
    }));

    const images = report.images.map((img) => ({
      beforeImage: imageToDataUri(img.beforeImage),
      afterImage: imageToDataUri(img.afterImage),
      description: img.description,
    }));

    // Company logo for the cover page
    const logo = imageToDataUri(path.join(process.cwd(), "public", "Logo-GF_LS.jpg"));

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InspectionPDF({ report, checklist, images, logo })
    );

    return {
      pdf: Buffer.from(pdfBuffer),
      filename: `inspection-${report.siteName.replace(/\s+/g, "-")}.pdf`,
    };
  }
}

export const inspectionService = new InspectionService();
