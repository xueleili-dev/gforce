import { prisma } from "@/lib/prisma";

export class NotificationService {
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    expenseId?: string;
  }) {
    return prisma.notification.create({ data });
  }

  async list(userId: string, page = 1, pageSize = 30) {
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export const notificationService = new NotificationService();
