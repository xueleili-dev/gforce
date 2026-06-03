import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/errors";

export class MaterialService {
  // ── Materials ──

  async listMaterials(params: { search?: string; categoryId?: string }) {
    const where: any = {};
    if (params.search) where.name = { contains: params.search, mode: "insensitive" };
    if (params.categoryId) where.categoryId = params.categoryId;
    return prisma.material.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getMaterial(id: string) {
    const m = await prisma.material.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!m) throw new NotFoundError("Material not found");
    return m;
  }

  async createMaterial(data: { name: string; categoryId?: string; spec?: string; unit?: string; safetyStock?: number }) {
    let categoryId = data.categoryId;
    if (!categoryId) {
      let general = await prisma.materialCategory.findFirst({ where: { name: "General" } });
      if (!general) general = await prisma.materialCategory.create({ data: { name: "General" } });
      categoryId = general.id;
    }
    return prisma.material.create({
      data: {
        name: data.name,
        categoryId,
        spec: data.spec || "",
        unit: data.unit || "",
        safetyStock: data.safetyStock || 0,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async updateMaterial(id: string, data: { name?: string; categoryId?: string; spec?: string; unit?: string; safetyStock?: number }) {
    await this.getMaterial(id);
    return prisma.material.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async deleteMaterial(id: string) {
    await this.getMaterial(id);
    await prisma.$transaction(async (tx) => {
      await tx.stockTransaction.deleteMany({ where: { materialId: id } });
      await tx.material.delete({ where: { id } });
    });
  }

  async deleteMaterialsByDateRange(startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate + "T23:59:59.999Z");
    const materials = await prisma.material.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true },
    });
    if (materials.length === 0) return 0;
    const ids = materials.map((m) => m.id);
    let count = 0;
    await prisma.$transaction(async (tx) => {
      const { count: txCount } = await tx.stockTransaction.deleteMany({ where: { materialId: { in: ids } } });
      const { count: matCount } = await tx.material.deleteMany({ where: { id: { in: ids } } });
      count = matCount;
    });
    return count;
  }

  async clearTransactionsByDateRange(startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate + "T23:59:59.999Z");
    const result = await prisma.stockTransaction.deleteMany({
      where: { createdAt: { gte: from, lte: to } },
    });
    return result.count;
  }

  async clearOutboundOrdersByDateRange(startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate + "T23:59:59.999Z");
    let count = 0;
    await prisma.$transaction(async (tx) => {
      const orders = await tx.outboundOrder.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { id: true },
      });
      const ids = orders.map((o) => o.id);
      if (ids.length > 0) {
        await tx.stockTransaction.deleteMany({ where: { orderId: { in: ids } } });
        const result = await tx.outboundOrder.deleteMany({ where: { id: { in: ids } } });
        count = result.count;
      }
    });
    return count;
  }

  async clearProjectsByDateRange(startDate: string, endDate: string) {
    const from = new Date(startDate);
    const to = new Date(endDate + "T23:59:59.999Z");
    const result = await prisma.outboundOrder.updateMany({
      where: { project: { not: "" }, createdAt: { gte: from, lte: to } },
      data: { project: "" },
    });
    return result.count;
  }

  // ── Transactions ──

  async listTransactions(params: {
    page?: number; pageSize?: number; type?: string;
    startDate?: string; endDate?: string; materialId?: string;
    customerId?: string; project?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 30;
    const where: any = {};
    if (params.type && params.type !== "all") where.type = params.type;
    if (params.materialId) where.materialId = params.materialId;
    if (params.project) where.notes = { contains: params.project, mode: "insensitive" };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }
    // Resolve customer -> outbound order IDs
    if (params.customerId) {
      where.AND = (where.AND || []);
      where.AND.push({ orderType: { in: ["outbound", "void"] } });
      const matchingOrders = await prisma.outboundOrder.findMany({
        where: { customerId: params.customerId },
        select: { id: true },
      });
      where.orderId = { in: matchingOrders.map((o) => o.id) };
    }

    const [items, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          material: { select: { name: true, unit: true } },
          operator: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    // Resolve customer names for outbound orders
    const outboundIds = Array.from(new Set(items.filter((t) => t.orderType === "outbound" || t.orderType === "void").map((t) => t.orderId)));
    const customerMap = new Map<string, string>();
    if (outboundIds.length > 0) {
      const orders = await prisma.outboundOrder.findMany({
        where: { id: { in: outboundIds } },
        include: { customer: { select: { name: true } } },
      });
      for (const o of orders) customerMap.set(o.id, o.customer.name);
    }

    return {
      items: items.map((t) => ({
        id: t.id,
        materialId: t.materialId,
        materialName: t.material.name,
        materialUnit: t.material.unit,
        type: t.type,
        quantity: t.quantity,
        beforeStock: t.beforeStock,
        afterStock: t.afterStock,
        orderType: t.orderType,
        orderId: t.orderId,
        operatorName: t.operator.name,
        customerName: customerMap.get(t.orderId) || "",
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    };
  }

  // ── Inbound ──

  private async resolveMaterial(tx: any, item: { materialId?: string; name?: string }) {
    if (item.materialId) {
      const m = await tx.material.findUnique({ where: { id: item.materialId } });
      if (m) return m;
    }
    if (item.name) {
      const existing = await tx.material.findFirst({ where: { name: item.name } });
      if (existing) return existing;
      // Auto-create material with a default "General" category
      let general = await tx.materialCategory.findFirst({ where: { name: "General" } });
      if (!general) {
        general = await tx.materialCategory.create({ data: { name: "General" } });
      }
      return tx.material.create({
        data: { name: item.name, categoryId: general.id },
      });
    }
    throw new NotFoundError("Material not found");
  }

  async createInbound(params: {
    items: { materialId?: string; name?: string; quantity: number }[];
    notes?: string;
    operatorId: string;
  }) {
    if (!params.items.length) throw new ConflictError("At least one material required");
    for (const item of params.items) {
      if (item.quantity <= 0) throw new ConflictError("Quantity must be positive");
    }

    const orderId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      for (const item of params.items) {
        const material = await this.resolveMaterial(tx, item);
        const before = material.currentStock;
        const after = before + item.quantity;

        await tx.stockTransaction.create({
          data: {
            materialId: material.id,
            type: "in",
            quantity: item.quantity,
            beforeStock: before,
            afterStock: after,
            orderType: "inbound",
            orderId,
            operatorId: params.operatorId,
            notes: params.notes || "",
          },
        });

        await tx.material.update({
          where: { id: material.id },
          data: { currentStock: after },
        });
      }
    });

    return { orderId };
  }

  async listInboundOrders(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const txWhere: any = { orderType: "inbound" };
    if (params.startDate || params.endDate) {
      txWhere.createdAt = {};
      if (params.startDate) txWhere.createdAt.gte = new Date(params.startDate);
      if (params.endDate) txWhere.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }
    // Get distinct order IDs
    const distinctOrders = await prisma.stockTransaction.findMany({
      where: txWhere,
      select: { orderId: true, createdAt: true, operatorId: true, notes: true },
      orderBy: { createdAt: "desc" },
      distinct: ["orderId"],
    });
    const total = distinctOrders.length;
    const paged = distinctOrders.slice((page - 1) * pageSize, page * pageSize);

    // For each order, get item details and cancellation status
    const items = await Promise.all(paged.map(async (o) => {
      const voidCount = await prisma.stockTransaction.count({
        where: { orderId: o.orderId, orderType: "void" },
      });
      const txs = await prisma.stockTransaction.findMany({
        where: { orderId: o.orderId, orderType: "inbound" },
        include: {
          material: { select: { name: true, unit: true } },
          operator: { select: { name: true } },
        },
      });
      return {
        orderId: o.orderId,
        createdAt: o.createdAt.toISOString(),
        operatorName: txs[0]?.operator.name || "",
        cancelled: voidCount > 0,
        items: txs.map((t) => ({
          materialName: t.material.name,
          quantity: t.quantity,
          unit: t.material.unit,
        })),
      };
    }));
    return { items, total };
  }

  async cancelInbound(orderId: string, operatorId: string) {
    const txs = await prisma.stockTransaction.findMany({
      where: { orderId, orderType: "inbound" },
    });
    if (txs.length === 0) throw new NotFoundError("Inbound order not found");

    // Check already cancelled
    const voidCount = await prisma.stockTransaction.count({
      where: { orderId, orderType: "void" },
    });
    if (voidCount > 0) throw new ConflictError("Order already cancelled");

    await prisma.$transaction(async (tx) => {
      for (const t of txs) {
        const material = await tx.material.findUnique({ where: { id: t.materialId } });
        if (!material || material.currentStock < t.quantity) continue;
        const before = material.currentStock;
        const after = before - t.quantity;
        await tx.stockTransaction.create({
          data: {
            materialId: t.materialId,
            type: "out",
            quantity: t.quantity,
            beforeStock: before,
            afterStock: after,
            orderType: "void",
            orderId,
            operatorId,
            notes: "Cancelled inbound order",
          },
        });
        await tx.material.update({
          where: { id: t.materialId },
          data: { currentStock: after },
        });
      }
    });
  }

  // ── Outbound ──

  async createOutbound(params: {
    customerId: string;
    project: string;
    items: { materialId: string; name: string; quantity: number; unit: string }[];
    operatorId: string;
  }) {
    if (!params.items.length) throw new ConflictError("At least one material required");

    const customer = await prisma.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new NotFoundError("Customer not found");

    for (const item of params.items) {
      if (item.quantity <= 0) throw new ConflictError("Quantity must be positive");
      const material = await prisma.material.findUnique({ where: { id: item.materialId } });
      if (!material) throw new NotFoundError(`Material ${item.materialId} not found`);
      if (material.currentStock < item.quantity) {
        throw new ConflictError(`Insufficient stock for "${material.name}": have ${material.currentStock}, need ${item.quantity}`);
      }
    }

    const order = await prisma.outboundOrder.create({
      data: {
        customerId: params.customerId,
        project: params.project,
        operatorId: params.operatorId,
        items: params.items,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const item of params.items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        const before = material!.currentStock;
        const after = before - item.quantity;

        await tx.stockTransaction.create({
          data: {
            materialId: item.materialId,
            type: "out",
            quantity: item.quantity,
            beforeStock: before,
            afterStock: after,
            orderType: "outbound",
            orderId: order.id,
            operatorId: params.operatorId,
            notes: params.project || "",
          },
        });

        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: after },
        });
      }
    });

    return { id: order.id };
  }

  async cancelOutbound(id: string, operatorId: string) {
    const order = await prisma.outboundOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundError("Outbound order not found");
    if (order.cancelled) throw new ConflictError("Order already cancelled");

    const items = order.items as { materialId: string; quantity: number }[];

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material) continue;
        const before = material.currentStock;
        const after = before + item.quantity;

        await tx.stockTransaction.create({
          data: {
            materialId: item.materialId,
            type: "in",
            quantity: item.quantity,
            beforeStock: before,
            afterStock: after,
            orderType: "void",
            orderId: order.id,
            operatorId,
            notes: "Cancelled outbound order",
          },
        });

        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: after },
        });
      }

      await tx.outboundOrder.update({
        where: { id },
        data: { cancelled: true },
      });
    });
  }

  async getOutboundOrder(id: string) {
    const order = await prisma.outboundOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        operator: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundError("Outbound order not found");
    return order;
  }

  async listOutboundOrders(params: {
    page?: number; pageSize?: number;
    startDate?: string; endDate?: string;
    customerId?: string; materialName?: string; project?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.project) where.project = { contains: params.project, mode: "insensitive" };
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
    }
    if (params.materialName) {
      // Search inside JSON items array for matching material name
      where.items = { path: "$[*].name", string_contains: params.materialName };
    }
    const [items, total] = await Promise.all([
      prisma.outboundOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.outboundOrder.count({ where }),
    ]);
    return {
      items: items.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: o.customer.name,
        project: o.project,
        operatorName: o.operator.name,
        items: o.items,
        notes: o.notes,
        cancelled: o.cancelled,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getHistoricalProjects() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1); // 365 days
    const orders = await prisma.outboundOrder.findMany({
      where: { project: { not: "" }, createdAt: { gte: cutoff } },
      select: { project: true },
      orderBy: { createdAt: "desc" },
      distinct: ["project"],
      take: 50,
    });
    return orders.map((o) => o.project);
  }

  // ── Customers ──

  async listCustomers() {
    return prisma.customer.findMany({ orderBy: { name: "asc" } });
  }

  async createCustomer(data: { name: string; contact?: string; phone?: string }) {
    return prisma.customer.create({ data });
  }

  async updateCustomer(id: string, data: { name?: string; contact?: string; phone?: string }) {
    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Customer not found");
    return prisma.customer.update({ where: { id }, data });
  }

  async deleteCustomer(id: string) {
    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Customer not found");
    const orderCount = await prisma.outboundOrder.count({ where: { customerId: id } });
    if (orderCount > 0) throw new ConflictError("Cannot delete customer with existing orders");
    return prisma.customer.delete({ where: { id } });
  }

  // ── Categories ──

  async listCategories() {
    return prisma.materialCategory.findMany({
      include: {
        materials: { orderBy: { name: "asc" } },
        _count: { select: { materials: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(data: { name: string }) {
    return prisma.materialCategory.create({ data: { name: data.name } });
  }

  async updateCategory(id: string, data: { name?: string }) {
    const c = await prisma.materialCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Category not found");
    return prisma.materialCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const c = await prisma.materialCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Category not found");
    const matCount = await prisma.material.count({ where: { categoryId: id } });
    if (matCount > 0) throw new ConflictError("Cannot delete category that has materials");
    return prisma.materialCategory.delete({ where: { id } });
  }
}

export const materialService = new MaterialService();
