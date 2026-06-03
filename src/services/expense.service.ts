import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";

export class ExpenseService {
  async list(params: {
    userId: string;
    role: string;
    status?: string;
    page: number;
    pageSize: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }) {
    const where: any = {};

    if (params.role === "employee") {
      where.applicantId = params.userId;
    } else if (params.role === "manager" || params.role === "dept_head") {
      const user = await prisma.user.findUnique({ where: { id: params.userId } });
      if (user) {
        where.departmentId = user.departmentId;
      }
    }

    if (params.status && params.status !== "all") {
      const statuses = params.status.split(",");
      if (statuses.length > 1) {
        where.status = { in: statuses };
      } else if (params.status === "submitted") {
        where.status = { in: ["submitted", "level1_approval", "level2_approval", "countersign", "finance_review"] };
      } else {
        where.status = params.status;
      }
    }

    if (params.search) {
      where.title = { contains: params.search };
    }

    if (params.startDate || params.endDate) {
      where.expenseDate = {};
      if (params.startDate) where.expenseDate.gte = new Date(params.startDate);
      if (params.endDate) where.expenseDate.lte = new Date(params.endDate);
    }

    if (params.minAmount !== undefined || params.maxAmount !== undefined) {
      where.amount = {};
      if (params.minAmount !== undefined) where.amount.gte = params.minAmount;
      if (params.maxAmount !== undefined) where.amount.lte = params.maxAmount;
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { applicant: { select: { name: true } }, department: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        title: e.title,
        project: e.project,
        type: e.type,
        amount: e.amount.toString(),
        status: e.status,
        applicantName: e.applicant.name,
        departmentName: e.department.name,
        expenseDate: e.expenseDate.toISOString().split("T")[0],
        createdAt: e.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async getById(id: string, userId: string, role: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        applicant: { select: { name: true } },
        department: { select: { name: true } },
        currentApprover: { select: { name: true } },
        approvalRecords: {
          include: { approver: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
      },
    });

    if (!expense) throw new NotFoundError("Expense not found");

    if (role === "employee" && expense.applicantId !== userId) {
      throw new ForbiddenError();
    }

    return {
      id: expense.id,
      title: expense.title,
      project: expense.project,
      type: expense.type,
      amount: expense.amount.toString(),
      status: expense.status,
      description: expense.description,
      expenseDate: expense.expenseDate.toISOString().split("T")[0],
      applicantName: expense.applicant.name,
      departmentName: expense.department.name,
      currentApproverName: expense.currentApprover?.name,
      approvalRecords: expense.approvalRecords.map((r) => ({
        id: r.id,
        level: r.level,
        approverName: r.approver.name,
        status: r.status,
        action: r.action,
        comment: r.comment,
        actedAt: r.actedAt?.toISOString(),
      })),
      attachments: expense.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        url: a.url,
        size: a.size,
        mimeType: a.mimeType,
      })),
    };
  }

  async create(data: {
    type: string;
    title: string;
    project: string;
    description: string;
    amount: number;
    expenseDate: string;
    userId: string;
    departmentId: string;
    isDraft: boolean;
    attachments?: { filename: string; url: string; size: number; mimeType: string }[];
  }) {
    const expense = await prisma.expense.create({
      data: {
        type: data.type as any,
        title: data.title,
        project: data.project || "",
        description: data.description,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
        applicantId: data.userId,
        departmentId: data.departmentId,
        status: data.isDraft ? "draft" : "submitted",
        attachments: data.attachments?.length
          ? { createMany: { data: data.attachments } }
          : undefined,
      },
    });

    if (!data.isDraft) {
      await this.buildApprovalChain(expense.id, data.amount, data.userId);
    }

    return { id: expense.id };
  }

  async update(id: string, userId: string, data: {
    type?: string;
    title?: string;
    description?: string;
    amount?: number;
    expenseDate?: string;
    attachments?: { filename: string; url: string; size: number; mimeType: string }[];
  }) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError("Expense not found");
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status !== "draft" && expense.status !== "rejected") {
      throw new ConflictError("Cannot modify in current status");
    }

    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type as any }),
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.amount && { amount: data.amount }),
        ...(data.expenseDate && { expenseDate: new Date(data.expenseDate) }),
        ...(data.attachments?.length
          ? { attachments: { createMany: { data: data.attachments } } }
          : {}),
      },
    });
  }

  async submit(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status !== "draft" && expense.status !== "rejected") {
      throw new ConflictError("Cannot submit in current status");
    }

    await prisma.expense.update({ where: { id }, data: { status: "submitted" } });
    await this.buildApprovalChain(id, Number(expense.amount), userId);
  }

  async delete(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== "admin") {
      if (expense.applicantId !== userId) throw new ForbiddenError();
      if (expense.status !== "draft") throw new ConflictError("Only drafts can be deleted");
    }
    // Cascade: delete approval records + attachments + notifications first
    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.deleteMany({ where: { expenseId: id } });
      await tx.attachment.deleteMany({ where: { expenseId: id } });
      await tx.notification.deleteMany({ where: { expenseId: id } });
      await tx.expense.delete({ where: { id } });
    });
  }

  async withdraw(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    if (expense.applicantId !== userId) throw new ForbiddenError();

    const activeStatuses = ["submitted", "level1_approval", "level2_approval", "countersign", "finance_review"];
    if (!activeStatuses.includes(expense.status)) {
      throw new ConflictError("Cannot withdraw in current status");
    }

    await prisma.approvalRecord.updateMany({
      where: { expenseId: id, status: "pending" },
      data: { status: "completed", action: "cancelled", actedAt: new Date() },
    });

    return prisma.expense.update({
      where: { id },
      data: { status: "withdrawn", currentApproverId: null },
    });
  }

  private async buildApprovalChain(expenseId: string, amount: number, applicantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      include: { department: { include: { head: true } } },
    });

    if (!user?.managerId) throw new ConflictError("No manager assigned, cannot submit for approval");

    const steps: { approverId: string; level: string }[] = [];

    steps.push({ approverId: user.managerId, level: "level1" });

    if (user.department.headId && user.department.headId !== user.managerId) {
      steps.push({ approverId: user.department.headId, level: "level2" });
    }

    if (amount > 10000) {
      const financeUsers = await prisma.user.findMany({
        where: { role: "finance" },
        take: 1,
      });
      if (financeUsers.length > 0) {
        steps.push({ approverId: financeUsers[0].id, level: "countersign" });
      }
    }

    const financeUsers = await prisma.user.findMany({
      where: { role: "finance" },
      take: 1,
    });
    if (financeUsers.length > 0) {
      steps.push({ approverId: financeUsers[0].id, level: "finance" });
    }

    if (steps.length === 0) throw new ConflictError("No approver found");

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { title: true },
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < steps.length; i++) {
        await tx.approvalRecord.create({
          data: {
            expenseId,
            approverId: steps[i].approverId,
            level: steps[i].level as any,
            status: i === 0 ? "pending" : "queued",
          },
        });
      }

      await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: "level1_approval",
          currentApproverId: steps[0].approverId,
        },
      });

      await tx.notification.create({
        data: {
          userId: steps[0].approverId,
          title: "Pending Approval",
          message: `${user.name} submitted "${expense?.title || ""}" for your approval`,
          type: "new_submission",
          expenseId,
        },
      });
    });
  }

  async getHistoricalProjects() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90); // 90 days
    const expenses = await prisma.expense.findMany({
      where: { project: { not: "" }, createdAt: { gte: cutoff } },
      select: { project: true },
      orderBy: { createdAt: "desc" },
      distinct: ["project"],
      take: 50,
    });
    return expenses.map((e) => e.project);
  }

  async clearAllExpenses() {
    let count = 0;
    await prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany();
      const ar = await tx.approvalRecord.deleteMany();
      const e = await tx.expense.deleteMany();
      await tx.notification.deleteMany();
      count = e.count;
    });
    return count;
  }

}

export const expenseService = new ExpenseService();
