import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { notificationService } from "./notification.service";

const LEVEL_LABELS: Record<string, string> = {
  level1: "Manager Approval",
  level2: "Dept Head Approval",
  countersign: "Countersign",
  finance: "Finance Review",
};

export class ApprovalService {
  async countPending(userId: string): Promise<number> {
    return prisma.approvalRecord.count({
      where: { approverId: userId, status: "pending" },
    });
  }

  async getPending(userId: string) {
    const records = await prisma.approvalRecord.findMany({
      where: { approverId: userId, status: "pending" },
      include: {
        expense: {
          include: {
            applicant: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      expenseId: r.expenseId,
      expenseTitle: r.expense.title,
      expenseType: r.expense.type,
      amount: r.expense.amount.toString(),
      description: r.expense.description,
      applicantName: r.expense.applicant.name,
      departmentName: r.expense.department.name,
      expenseDate: r.expense.expenseDate.toISOString().split("T")[0],
      level: r.level,
    }));
  }

  async approve(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true, approver: true },
    });

    if (!record) throw new NotFoundError("Approval record not found");
    if (record.approverId !== userId) throw new ForbiddenError("You are not the current approver");
    if (record.status !== "pending") throw new ConflictError("Approval already completed");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "approved", comment, actedAt: new Date() },
      });

      await this.advanceToNextStep(tx, record.expenseId);
    });

    await notificationService.create({
      userId: record.expense.applicantId,
      title: "Approved",
      message: `Your request "${record.expense.title}" was approved at ${LEVEL_LABELS[record.level] || record.level}`,
      type: "approval_result",
      expenseId: record.expenseId,
    });
  }

  async reject(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true, approver: true },
    });

    if (!record) throw new NotFoundError("Approval record not found");
    if (record.approverId !== userId) throw new ForbiddenError("You are not the current approver");
    if (record.status !== "pending") throw new ConflictError("Approval already completed");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "rejected", comment, actedAt: new Date() },
      });

      await tx.approvalRecord.updateMany({
        where: { expenseId: record.expenseId, status: { in: ["pending", "queued"] } },
        data: { status: "completed", action: "cancelled" },
      });

      await tx.expense.update({
        where: { id: record.expenseId },
        data: { status: "rejected", currentApproverId: null },
      });
    });

    await notificationService.create({
      userId: record.expense.applicantId,
      title: "Rejected",
      message: `Your request "${record.expense.title}" was rejected by ${record.approver.name}${comment ? `: ${comment}` : ""}`,
      type: "approval_result",
      expenseId: record.expenseId,
    });
  }

  async returnForRevision(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true, approver: true },
    });

    if (!record) throw new NotFoundError("Approval record not found");
    if (record.approverId !== userId) throw new ForbiddenError("You are not the current approver");
    if (record.status !== "pending") throw new ConflictError("Approval already completed");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "returned", comment, actedAt: new Date() },
      });

      await tx.approvalRecord.updateMany({
        where: { expenseId: record.expenseId, status: { in: ["pending", "queued"] } },
        data: { status: "completed", action: "cancelled" },
      });

      await tx.expense.update({
        where: { id: record.expenseId },
        data: { status: "rejected", currentApproverId: null },
      });
    });

    await notificationService.create({
      userId: record.expense.applicantId,
      title: "Returned",
      message: `Your request "${record.expense.title}" was returned for revision by ${record.approver.name}${comment ? `: ${comment}` : ""}`,
      type: "approval_result",
      expenseId: record.expenseId,
    });
  }

  private async advanceToNextStep(tx: any, expenseId: string) {
    // Find the next queued record to activate
    const nextQueued = await tx.approvalRecord.findFirst({
      where: { expenseId, status: "queued" },
      orderBy: { createdAt: "asc" },
    });

    if (!nextQueued) {
      // No more queued records — all steps completed
      await tx.expense.update({
        where: { id: expenseId },
        data: { status: "approved", currentApproverId: null },
      });

      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        select: { applicantId: true, title: true },
      });

      await tx.notification.create({
        data: {
          userId: expense.applicantId,
          title: "All Approved",
          message: `Your request "${expense.title}" has been fully approved, pending finance release`,
          type: "approval_result",
          expenseId,
        },
      });
      return;
    }

    // Activate the next step from queued to pending
    await tx.approvalRecord.update({
      where: { id: nextQueued.id },
      data: { status: "pending" },
    });

    const STATUS_MAP: Record<string, string> = {
      level1: "level1_approval",
      level2: "level2_approval",
      countersign: "countersign",
      finance: "finance_review",
    };

    await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: STATUS_MAP[nextQueued.level] || nextQueued.level,
        currentApproverId: nextQueued.approverId,
      },
    });

    // Notify the next approver
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      select: { title: true, applicant: { select: { name: true } } },
    });

    await tx.notification.create({
      data: {
        userId: nextQueued.approverId,
        title: "Pending Approval",
        message: `${expense.applicant.name} submitted "${expense.title}" for your approval`,
        type: "new_submission",
        expenseId,
      },
    });
  }

  async markAsPaid(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundError();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "finance") throw new ForbiddenError("Only finance can release payment");
    if (expense.status !== "approved") throw new ConflictError("Only approved expenses can be paid");

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { status: "paid" },
      });

      const budget = await tx.budget.findUnique({
        where: { year_departmentId: { year: new Date().getFullYear(), departmentId: expense.departmentId } },
      });
      if (budget) {
        await tx.budget.update({
          where: { id: budget.id },
          data: { usedAmount: { increment: expense.amount } },
        });
      }
    });

    await notificationService.create({
      userId: expense.applicantId,
      title: "Payment Released",
      message: `Your request "${expense.title}" has been paid`,
      type: "approval_result",
      expenseId,
    });
  }
}

export const approvalService = new ApprovalService();
