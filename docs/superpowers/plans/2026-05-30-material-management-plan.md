# Material Management Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a peer-level Material Management module (inventory tracking, inbound/outbound operations, customer/project management) alongside the existing Expense Management system.

**Architecture:** New Prisma models (6 tables) with a `material.service.ts` business layer, 16 API route handlers under `/api/materials/*`, 6 frontend pages under `(dashboard)/materials/`, sidebar section with role-based visibility, and i18n keys in both en and zh. Follows existing patterns: RESTful route handlers → service → Prisma, client components with Tailwind, role-filtered sidebar menus.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL (Neon), TypeScript, Tailwind CSS, next-auth v5

---

## File Structure

**Create (18 files):**
```
src/services/material.service.ts
src/app/(dashboard)/materials/page.tsx
src/app/(dashboard)/materials/inbound/page.tsx
src/app/(dashboard)/materials/outbound/page.tsx
src/app/(dashboard)/materials/customers/page.tsx
src/app/(dashboard)/materials/projects/page.tsx
src/app/(dashboard)/materials/categories/page.tsx
src/app/api/materials/route.ts
src/app/api/materials/[id]/route.ts
src/app/api/materials/transactions/route.ts
src/app/api/materials/customers/route.ts
src/app/api/materials/customers/[id]/route.ts
src/app/api/materials/projects/route.ts
src/app/api/materials/projects/[id]/route.ts
src/app/api/materials/categories/route.ts
src/app/api/materials/categories/[id]/route.ts
src/app/api/materials/inbound/route.ts
src/app/api/materials/outbound/route.ts
src/app/api/materials/outbound/[id]/route.ts
```

**Modify (4 files):**
```
prisma/schema.prisma                        — add 6 models
src/i18n/dictionaries.ts                    — add material.* section
src/components/layout/sidebar.tsx            — material section + grouping logic
src/middleware.ts                            — extend protectedPaths and authApiPaths
```

---

### Task 1: Add Prisma Models and Run Generate

**Files:**
- Modify: `prisma/schema.prisma` — append 6 new models after Notification model

- [ ] **Step 1: Append models to schema**

Add after the Notification model (line 122):

```prisma
model MaterialCategory {
  id        String              @id @default(uuid())
  name      String              @unique
  parentId  String?
  parent    MaterialCategory?   @relation("CategoryChildren", fields: [parentId], references: [id])
  children  MaterialCategory[]  @relation("CategoryChildren")
  materials Material[]
  createdAt DateTime            @default(now()) @map("created_at")
  updatedAt DateTime            @updatedAt @map("updated_at")

  @@map("material_categories")
}

model Material {
  id           String            @id @default(uuid())
  name         String
  categoryId   String            @map("category_id")
  category     MaterialCategory  @relation(fields: [categoryId], references: [id])
  spec         String            @default("")
  unit         String            @default("")
  safetyStock  Float             @default(0) @map("safety_stock")
  currentStock Float             @default(0) @map("current_stock")
  transactions StockTransaction[]
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")

  @@map("materials")
}

model Customer {
  id             String          @id @default(uuid())
  name           String          @unique
  contact        String          @default("")
  phone          String          @default("")
  outboundOrders OutboundOrder[]
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  @@map("customers")
}

model Project {
  id             String          @id @default(uuid())
  name           String          @unique
  status         String          @default("active")
  outboundOrders OutboundOrder[]
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  @@map("projects")
}

model OutboundOrder {
  id         String         @id @default(uuid())
  customerId String         @map("customer_id")
  customer   Customer       @relation(fields: [customerId], references: [id])
  projectId  String         @map("project_id")
  project    Project        @relation(fields: [projectId], references: [id])
  operatorId String         @map("operator_id")
  operator   User           @relation(fields: [operatorId], references: [id])
  items      Json
  notes      String         @default("")
  cancelled  Boolean        @default(false)
  createdAt  DateTime       @default(now()) @map("created_at")
  updatedAt  DateTime       @updatedAt @map("updated_at")

  @@map("outbound_orders")
}

model StockTransaction {
  id          String    @id @default(uuid())
  materialId  String    @map("material_id")
  material    Material  @relation(fields: [materialId], references: [id])
  type        String
  quantity    Float
  beforeStock Float     @map("before_stock")
  afterStock  Float     @map("after_stock")
  orderType   String    @map("order_type")
  orderId     String    @map("order_id")
  operatorId  String    @map("operator_id")
  operator    User      @relation(fields: [operatorId], references: [id])
  notes       String    @default("")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([materialId])
  @@index([createdAt])
  @@map("stock_transactions")
}
```

- [ ] **Step 2: Run Prisma generate**

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client" — no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Material Management models to Prisma schema"
```

---

### Task 2: Add Material Service

**Files:**
- Create: `src/services/material.service.ts`

- [ ] **Step 1: Create material service with all business logic**

```ts
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

  async createMaterial(data: { name: string; categoryId: string; spec?: string; unit?: string; safetyStock?: number }) {
    return prisma.material.create({
      data: {
        name: data.name,
        categoryId: data.categoryId,
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
    const txCount = await prisma.stockTransaction.count({ where: { materialId: id } });
    if (txCount > 0) throw new ConflictError("Cannot delete material with transaction history");
    return prisma.material.delete({ where: { id } });
  }

  // ── Transactions ──

  async listTransactions(params: {
    page?: number; pageSize?: number; type?: string;
    startDate?: string; endDate?: string; materialId?: string;
  }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 30;
    const where: any = {};
    if (params.type && params.type !== "all") where.type = params.type;
    if (params.materialId) where.materialId = params.materialId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate + "T23:59:59.999Z");
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
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
    };
  }

  // ── Inbound ──

  async createInbound(params: {
    items: { materialId: string; quantity: number }[];
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
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material) throw new NotFoundError(`Material ${item.materialId} not found`);

        const before = material.currentStock;
        const after = before + item.quantity;

        await tx.stockTransaction.create({
          data: {
            materialId: item.materialId,
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
          where: { id: item.materialId },
          data: { currentStock: after },
        });
      }
    });

    return { orderId };
  }

  // ── Outbound ──

  async createOutbound(params: {
    customerId: string;
    projectId: string;
    items: { materialId: string; name: string; quantity: number; unit: string }[];
    notes?: string;
    operatorId: string;
  }) {
    if (!params.items.length) throw new ConflictError("At least one material required");

    const customer = await prisma.customer.findUnique({ where: { id: params.customerId } });
    if (!customer) throw new NotFoundError("Customer not found");

    const project = await prisma.project.findUnique({ where: { id: params.projectId } });
    if (!project) throw new NotFoundError("Project not found");

    // Validate stock sufficiency
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
        projectId: params.projectId,
        operatorId: params.operatorId,
        items: params.items,
        notes: params.notes || "",
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const item of params.items) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } })!;
        const before = (await tx.material.findUnique({ where: { id: item.materialId } }))!.currentStock;
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
            notes: params.notes || "",
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
        project: { select: { id: true, name: true } },
        operator: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundError("Outbound order not found");
    return order;
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

  // ── Projects ──

  async listProjects() {
    return prisma.project.findMany({ orderBy: { name: "asc" } });
  }

  async createProject(data: { name: string }) {
    return prisma.project.create({ data });
  }

  async updateProject(id: string, data: { name?: string; status?: string }) {
    const p = await prisma.project.findUnique({ where: { id } });
    if (!p) throw new NotFoundError("Project not found");
    return prisma.project.update({ where: { id }, data });
  }

  async deleteProject(id: string) {
    const p = await prisma.project.findUnique({ where: { id } });
    if (!p) throw new NotFoundError("Project not found");
    const orderCount = await prisma.outboundOrder.count({ where: { projectId: id } });
    if (orderCount > 0) throw new ConflictError("Cannot delete project with existing orders");
    return prisma.project.delete({ where: { id } });
  }

  // ── Categories ──

  async listCategories() {
    return prisma.materialCategory.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { materials: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(data: { name: string; parentId?: string }) {
    return prisma.materialCategory.create({
      data: {
        name: data.name,
        ...(data.parentId ? { parentId: data.parentId } : {}),
      },
    });
  }

  async updateCategory(id: string, data: { name?: string; parentId?: string | null }) {
    const c = await prisma.materialCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Category not found");
    return prisma.materialCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const c = await prisma.materialCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundError("Category not found");
    const matCount = await prisma.material.count({ where: { categoryId: id } });
    if (matCount > 0) throw new ConflictError("Cannot delete category that has materials");
    const childCount = await prisma.materialCategory.count({ where: { parentId: id } });
    if (childCount > 0) throw new ConflictError("Cannot delete category that has sub-categories");
    return prisma.materialCategory.delete({ where: { id } });
  }
}

export const materialService = new MaterialService();
```

- [ ] **Step 2: Commit**

```bash
git add src/services/material.service.ts
git commit -m "feat: add Material service with full business logic"
```

---

### Task 3: Add API Route — Materials CRUD

**Files:**
- Create: `src/app/api/materials/route.ts`
- Create: `src/app/api/materials/[id]/route.ts`
- Create: `src/app/api/materials/transactions/route.ts`

- [ ] **Step 1: Create materials list/create route**

`src/app/api/materials/route.ts`:

```ts
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
```

- [ ] **Step 2: Create materials get/update/delete route**

`src/app/api/materials/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const m = await materialService.getMaterial(params.id);
  return NextResponse.json(m);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  const m = await materialService.updateMaterial(params.id, body);
  return NextResponse.json(m);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await materialService.deleteMaterial(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create transactions list route**

`src/app/api/materials/transactions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const data = await materialService.listTransactions({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "30"),
    type: searchParams.get("type") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    materialId: searchParams.get("materialId") || undefined,
  });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/materials/
git commit -m "feat: add materials CRUD and transactions API routes"
```

---

### Task 4: Add API Routes — Customers, Projects, Categories

**Files:**
- Create: `src/app/api/materials/customers/route.ts`
- Create: `src/app/api/materials/customers/[id]/route.ts`
- Create: `src/app/api/materials/projects/route.ts`
- Create: `src/app/api/materials/projects/[id]/route.ts`
- Create: `src/app/api/materials/categories/route.ts`
- Create: `src/app/api/materials/categories/[id]/route.ts`

- [ ] **Step 1: Customer routes**

`src/app/api/materials/customers/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.listCustomers());
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  const c = await materialService.createCustomer(body);
  return NextResponse.json(c, { status: 201 });
}
```

`src/app/api/materials/customers/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.updateCustomer(params.id, body));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await materialService.deleteCustomer(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Project routes**

`src/app/api/materials/projects/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.listProjects());
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.createProject(body), { status: 201 });
}
```

`src/app/api/materials/projects/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.updateProject(params.id, body));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await materialService.deleteProject(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Category routes**

`src/app/api/materials/categories/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.listCategories());
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.createCategory(body), { status: 201 });
}
```

`src/app/api/materials/categories/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  return NextResponse.json(await materialService.updateCategory(params.id, body));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  await materialService.deleteCategory(params.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/materials/customers/ src/app/api/materials/projects/ src/app/api/materials/categories/
git commit -m "feat: add customers, projects, categories API routes"
```

---

### Task 5: Add API Routes — Inbound and Outbound

**Files:**
- Create: `src/app/api/materials/inbound/route.ts`
- Create: `src/app/api/materials/outbound/route.ts`
- Create: `src/app/api/materials/outbound/[id]/route.ts`

- [ ] **Step 1: Inbound route**

`src/app/api/materials/inbound/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const result = await materialService.createInbound({
    items: body.items,
    notes: body.notes,
    operatorId: user.id,
  });
  return NextResponse.json(result, { status: 201 });
}
```

- [ ] **Step 2: Outbound create and cancel routes**

`src/app/api/materials/outbound/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const body = await req.json();
  const result = await materialService.createOutbound({
    customerId: body.customerId,
    projectId: body.projectId,
    items: body.items,
    notes: body.notes,
    operatorId: user.id,
  });
  return NextResponse.json(result, { status: 201 });
}
```

`src/app/api/materials/outbound/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { materialService } from "@/services/material.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  return NextResponse.json(await materialService.getOutboundOrder(params.id));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  if (user.role === "employee") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  const body = await req.json();
  if (body.action === "cancel") {
    await materialService.cancelOutbound(params.id, user.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/materials/inbound/ src/app/api/materials/outbound/
git commit -m "feat: add inbound and outbound API routes"
```

---

### Task 6: Add i18n Dictionary Keys

**Files:**
- Modify: `src/i18n/dictionaries.ts`

- [ ] **Step 1: Add material section to English dictionary**

Find the closing of the `en` dictionary (after the last existing key like `sidebar.logout`). Add a new `material` section:

```ts
    material: {
      sidebarTitle: "Material Mgmt",
      overview: "Material Overview",
      addStock: "Add Stock",
      outbound: "Outbound",
      customers: "Customers",
      projects: "Projects",
      categories: "Categories",
      name: "Name",
      category: "Category",
      spec: "Spec",
      unit: "Unit",
      currentStock: "Stock",
      safetyStock: "Safety",
      status: "Status",
      normal: "Normal",
      low: "Low Stock",
      out: "Out",
      inbound: "Inbound",
      outbound: "Outbound",
      transactionHistory: "Transaction History",
      recentTransactions: "Recent Transactions",
      selectCustomer: "Select Customer",
      selectProject: "Select Project",
      quantity: "Qty",
      notes: "Notes",
      addMaterial: "+ Add Material",
      remove: "Remove",
      customerName: "Name",
      contact: "Contact",
      phone: "Phone",
      projectName: "Name",
      projectStatus: "Status",
      active: "Active",
      archived: "Archived",
      categoryName: "Name",
      parentCategory: "Parent Category",
      materialCount: "Materials",
      confirmDelete: "Are you sure you want to delete this?",
      cancelOrder: "Cancel this order? Stock will be restored.",
      insufficientStock: "Insufficient stock",
      submit: "Submit",
      search: "Search materials...",
      type: "Type",
      operator: "Operator",
      customer: "Customer",
      project: "Project",
      date: "Date",
      createMaterial: "New Material",
      editMaterial: "Edit Material",
      createCustomer: "New Customer",
      editCustomer: "Edit Customer",
      createProject: "New Project",
      editProject: "Edit Project",
      createCategory: "New Category",
      editCategory: "Edit Category",
    },
```

- [ ] **Step 2: Add material section to Chinese dictionary**

Find the closing of the `zh` dictionary. Add:

```ts
    material: {
      sidebarTitle: "物料管理",
      overview: "物料总览",
      addStock: "入库",
      outbound: "出库",
      customers: "客户管理",
      projects: "项目管理",
      categories: "分类管理",
      name: "名称",
      category: "分类",
      spec: "规格",
      unit: "单位",
      currentStock: "库存",
      safetyStock: "安全库存",
      status: "状态",
      normal: "正常",
      low: "低库存",
      out: "缺货",
      inbound: "入库",
      outbound: "出库",
      transactionHistory: "出入库记录",
      recentTransactions: "最近记录",
      selectCustomer: "选择客户",
      selectProject: "选择项目",
      quantity: "数量",
      notes: "备注",
      addMaterial: "+ 添加物料",
      remove: "移除",
      customerName: "名称",
      contact: "联系人",
      phone: "电话",
      projectName: "名称",
      projectStatus: "状态",
      active: "进行中",
      archived: "已归档",
      categoryName: "名称",
      parentCategory: "上级分类",
      materialCount: "物料数",
      confirmDelete: "确定要删除吗？",
      cancelOrder: "确定要取消此出库单吗？库存将恢复。",
      insufficientStock: "库存不足",
      submit: "提交",
      search: "搜索物料...",
      type: "类型",
      operator: "操作人",
      customer: "客户",
      project: "项目",
      date: "日期",
      createMaterial: "新建物料",
      editMaterial: "编辑物料",
      createCustomer: "新建客户",
      editCustomer: "编辑客户",
      createProject: "新建项目",
      editProject: "编辑项目",
      createCategory: "新建分类",
      editCategory: "编辑分类",
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/dictionaries.ts
git commit -m "feat: add material management i18n keys (en + zh)"
```

---

### Task 7: Update Sidebar with Material Section

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add material menu entries and section grouping logic**

Replace the entire `MENU_KEYS` array and the `nav` rendering block. The key changes:
1. Add `section` property to MENU_KEYS entries
2. Group items by section when rendering
3. Insert divider + section header between groups

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useI18n } from "@/i18n";

type MenuItem = {
  href: string;
  i18nKey: string;
  roles: string[];
  section: "expense" | "materials";
};

const MENU_KEYS: MenuItem[] = [
  { href: "/expenses", i18nKey: "sidebar.myExpenses", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/expenses/new", i18nKey: "sidebar.newExpense", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/approvals", i18nKey: "sidebar.pendingApprovals", roles: ["manager", "dept_head", "finance"], section: "expense" },
  { href: "/reports", i18nKey: "sidebar.reports", roles: ["manager", "dept_head", "finance", "admin"], section: "expense" },
  { href: "/budgets", i18nKey: "sidebar.budgets", roles: ["dept_head", "finance", "admin"], section: "expense" },
  { href: "/settings/users", i18nKey: "sidebar.userManagement", roles: ["admin"], section: "expense" },
  { href: "/settings/departments", i18nKey: "sidebar.departmentManagement", roles: ["admin"], section: "expense" },
  { href: "/notifications", i18nKey: "sidebar.notifications", roles: ["employee", "manager", "dept_head", "finance", "admin"], section: "expense" },
  // Material Management section
  { href: "/materials", i18nKey: "material.overview", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/inbound", i18nKey: "material.addStock", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/outbound", i18nKey: "material.outbound", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/customers", i18nKey: "material.customers", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/projects", i18nKey: "material.projects", roles: ["manager", "dept_head", "finance", "admin"], section: "materials" },
  { href: "/materials/categories", i18nKey: "material.categories", roles: ["dept_head", "finance", "admin"], section: "materials" },
];

export function Sidebar({
  userRole,
  pendingCount,
  isOpen,
  onClose,
}: {
  userRole: string;
  pendingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  const visibleItems = MENU_KEYS.filter((item) => item.roles.includes(userRole));
  const expenseItems = visibleItems.filter((i) => i.section === "expense");
  const materialItems = visibleItems.filter((i) => i.section === "materials");

  function renderLink(item: MenuItem) {
    const showBadge = item.href === "/approvals" && pendingCount !== undefined && pendingCount > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`mb-0.5 flex items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
          pathname === item.href || (item.href !== "/materials" && pathname.startsWith(item.href))
            ? "bg-slate-700 text-white"
            : "text-slate-300 hover:bg-slate-700 hover:text-white"
        }`}
      >
        <span>{t(item.i18nKey)}</span>
        {showBadge && (
          <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 min-w-[20px] h-5 text-[11px] font-bold text-white leading-none">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </Link>
    );
  }

  const nav = (
    <div className="flex h-full w-56 flex-col bg-slate-800 text-white">
      <div className="border-b border-slate-700 px-4 py-5">
        <h1 className="text-lg font-bold">{t("sidebar.title")}</h1>
        <p className="mt-1 text-xs text-slate-400">GOLDEN FORCE PTY LTD</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {expenseItems.map(renderLink)}

        {materialItems.length > 0 && (
          <>
            <div className="mt-3 mb-1 border-t border-slate-700 pt-3">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {t("material.sidebarTitle")}
              </p>
            </div>
            {materialItems.map(renderLink)}
          </>
        )}

        <div className="border-t border-slate-700 mt-2 pt-2">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            {t("sidebar.logout")}
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0">{nav}</div>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full">{nav}</div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Material Mgmt section to sidebar with role-based visibility"
```

---

### Task 8: Update Middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add /materials to protected paths**

```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const protectedPaths = ["/expenses", "/approvals", "/budgets", "/reports", "/settings", "/notifications", "/materials"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const authApiPaths = ["/api/expenses", "/api/approvals", "/api/budgets", "/api/reports", "/api/upload", "/api/materials"];
  const isAuthApi = authApiPaths.some((p) => pathname.startsWith(p));

  if (isAuthApi && !isLoggedIn) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Access denied" } }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: protect /materials routes in middleware"
```

---

### Task 9: Add Frontend — Material Overview Page

**Files:**
- Create: `src/app/(dashboard)/materials/page.tsx`

- [ ] **Step 1: Create Material Overview page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

export default function MaterialsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [materials, setMaterials] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [txType, setTxType] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);

  useEffect(() => {
    fetch("/api/materials/categories").then((r) => r.json()).then(setCategories);
  }, []);

  const loadMaterials = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("categoryId", categoryFilter);
    fetch(`/api/materials?${params}`).then((r) => r.json()).then(setMaterials);
  };

  const loadTransactions = () => {
    const params = new URLSearchParams({ type: txType, page: String(txPage), pageSize: "15" });
    fetch(`/api/materials/transactions?${params}`).then((r) => r.json()).then((d) => {
      setTransactions(d.items || []);
      setTxTotal(d.total || 0);
    });
  };

  useEffect(() => { setLoading(true); loadMaterials(); loadTransactions(); setLoading(false); }, [search, categoryFilter, txType, txPage]);

  function getStockStatus(item: any) {
    if (item.currentStock <= 0) return { label: t("material.out"), color: "bg-red-100 text-red-700" };
    if (item.currentStock <= item.safetyStock) return { label: t("material.low"), color: "bg-yellow-100 text-yellow-700" };
    return { label: t("material.normal"), color: "bg-green-100 text-green-700" };
  }

  const txTotalPages = Math.max(1, Math.ceil(txTotal / 15));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.overview")}</h2>
        <div className="flex gap-2">
          <button onClick={() => router.push("/materials/inbound")} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
            {t("material.addStock")}
          </button>
          <button onClick={() => router.push("/materials/outbound")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {t("material.outbound")}
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("material.search")}
          className="w-56 rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-slate-200 px-3 py-1.5 text-sm">
          <option value="">{t("material.category")}</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button onClick={() => router.push("/materials/customers")} className="rounded border border-slate-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          {t("material.customers")}
        </button>
      </div>

      <div className="rounded-lg bg-white shadow-sm mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.name")}</th>
              <th className="px-3 py-2 text-left">{t("material.category")}</th>
              <th className="px-3 py-2 text-left">{t("material.spec")}</th>
              <th className="px-3 py-2 text-center">{t("material.unit")}</th>
              <th className="px-3 py-2 text-right">{t("material.currentStock")}</th>
              <th className="px-3 py-2 text-right">{t("material.safetyStock")}</th>
              <th className="px-3 py-2 text-center">{t("material.status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No materials yet</td></tr>
            ) : (
              materials.map((m) => {
                const st = getStockStatus(m);
                return (
                  <tr key={m.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 text-gray-500">{m.categoryName}</td>
                    <td className="px-3 py-2 text-gray-500">{m.spec || "-"}</td>
                    <td className="px-3 py-2 text-center text-gray-500">{m.unit || "-"}</td>
                    <td className="px-3 py-2 text-right font-medium">{m.currentStock}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{m.safetyStock}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction History */}
      <h3 className="font-medium mb-3">{t("material.transactionHistory")}</h3>

      <div className="mb-3 flex items-center gap-2">
        <select value={txType} onChange={(e) => { setTxType(e.target.value); setTxPage(1); }}
          className="rounded border border-slate-200 px-3 py-1.5 text-sm">
          <option value="all">All</option>
          <option value="in">{t("material.inbound")}</option>
          <option value="out">{t("material.outbound")}</option>
        </select>
      </div>

      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.date")}</th>
              <th className="px-3 py-2 text-center">{t("material.type")}</th>
              <th className="px-3 py-2 text-left">{t("material.name")}</th>
              <th className="px-3 py-2 text-right">{t("material.quantity")}</th>
              <th className="px-3 py-2 text-right">{t("material.currentStock")}</th>
              <th className="px-3 py-2 text-left">{t("material.operator")}</th>
              <th className="px-3 py-2 text-left">{t("material.customer")}</th>
              <th className="px-3 py-2 text-left">{t("material.project")}</th>
              <th className="px-3 py-2 text-left">{t("material.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>
            ) : (
              transactions.map((tx) => {
                const isOutCancelled = tx.orderType === "void" && tx.type === "in";
                const typeLabel = isOutCancelled ? "Void" : tx.type === "in" ? t("material.inbound") : t("material.outbound");
                const typeColor = isOutCancelled ? "bg-gray-100 text-gray-500" :
                  tx.type === "in" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";
                return (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${typeColor}`}>{typeLabel}</span>
                    </td>
                    <td className="px-3 py-2 font-medium">{tx.materialName}</td>
                    <td className="px-3 py-2 text-right">{tx.quantity} {tx.materialUnit}</td>
                    <td className="px-3 py-2 text-right">{tx.afterStock}</td>
                    <td className="px-3 py-2 text-gray-500">{tx.operatorName}</td>
                    <td className="px-3 py-2 text-gray-500">{tx.orderType === "outbound" || tx.orderType === "void" ? (tx.notes || "-") : "-"}</td>
                    <td className="px-3 py-2 text-gray-500">-</td>
                    <td className="px-3 py-2 text-gray-400">{tx.notes || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {txTotal > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>{txTotal} records</span>
          <div className="flex gap-1">
            <button onClick={() => setTxPage((p) => Math.max(1, p - 1))} disabled={txPage <= 1}
              className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&larr;</button>
            <span className="px-2 py-0.5">{txPage} / {txTotalPages}</span>
            <button onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))} disabled={txPage >= txTotalPages}
              className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&rarr;</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/materials/page.tsx
git commit -m "feat: add Material Overview page with stock table and transaction history"
```

---

### Task 10: Add Frontend — Inbound Page

**Files:**
- Create: `src/app/(dashboard)/materials/inbound/page.tsx`

- [ ] **Step 1: Create inbound form page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

export default function InboundPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [materials, setMaterials] = useState<any[]>([]);
  const [rows, setRows] = useState<{ materialId: string; quantity: number }[]>([{ materialId: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/materials").then((r) => r.json()).then(setMaterials);
  }, []);

  function addRow() {
    setRows([...rows, { materialId: "", quantity: 1 }]);
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: string, value: any) {
    const next = [...rows];
    (next[i] as any)[field] = value;
    setRows(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const items = rows.filter((r) => r.materialId && r.quantity > 0);
    if (items.length === 0) { setError("Add at least one material with quantity > 0"); return; }

    setSubmitting(true);
    const res = await fetch("/api/materials/inbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, notes }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Submit failed");
      setSubmitting(false);
      return;
    }
    router.push("/materials");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-6">{t("material.addStock")}</h2>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 p-6">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
          )}

          {rows.map((row, i) => (
            <div key={i} className="mb-3 flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">{t("material.name")}</label>
                <select value={row.materialId} onChange={(e) => updateRow(i, "materialId", e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  <option value="">{t("material.name")}...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.categoryName}, stock: {m.currentStock})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs text-gray-500">{t("material.quantity")}</label>
                <input type="number" min="1" value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <button type="button" onClick={() => removeRow(i)}
                className="mb-0.5 rounded px-2 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">{t("material.remove")}</button>
            </div>
          ))}

          <button type="button" onClick={addRow}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium">{t("material.addMaterial")}</button>

          <div className="mb-6">
            <label className="mb-1 block text-xs text-gray-500">{t("material.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
            {submitting ? "..." : t("material.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/materials/inbound/page.tsx
git commit -m "feat: add Inbound (Add Stock) page"
```

---

### Task 11: Add Frontend — Outbound Page

**Files:**
- Create: `src/app/(dashboard)/materials/outbound/page.tsx`

- [ ] **Step 1: Create outbound form page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

export default function OutboundPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [materials, setMaterials] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState<{ materialId: string; quantity: number }[]>([{ materialId: "", quantity: 1 }]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/materials").then((r) => r.json()).then(setMaterials);
    fetch("/api/materials/customers").then((r) => r.json()).then(setCustomers);
    fetch("/api/materials/projects").then((r) => r.json()).then((d) => setProjects(d.filter((p: any) => p.status === "active")));
  }, []);

  function addRow() { setRows([...rows, { materialId: "", quantity: 1 }]); }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: string, value: any) {
    const next = [...rows];
    (next[i] as any)[field] = value;
    setRows(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerId) { setError("Select a customer"); return; }
    if (!projectId) { setError("Select a project"); return; }

    const items = rows
      .filter((r) => r.materialId && r.quantity > 0)
      .map((r) => {
        const mat = materials.find((m) => m.id === r.materialId);
        return { materialId: r.materialId, name: mat?.name || "", quantity: r.quantity, unit: mat?.unit || "" };
      });

    if (items.length === 0) { setError("Add at least one material with quantity > 0"); return; }

    setSubmitting(true);
    const res = await fetch("/api/materials/outbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, projectId, items, notes }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Submit failed");
      setSubmitting(false);
      return;
    }
    router.push("/materials");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-6">{t("material.outbound")}</h2>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 p-6">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">{t("material.customer")}</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                <option value="">{t("material.selectCustomer")}...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">{t("material.project")}</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                <option value="">{t("material.selectProject")}...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="mb-3 flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">{t("material.name")}</label>
                <select value={row.materialId} onChange={(e) => updateRow(i, "materialId", e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  <option value="">{t("material.name")}...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} (stock: {m.currentStock})</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs text-gray-500">{t("material.quantity")}</label>
                <input type="number" min="1" value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", parseInt(e.target.value) || 0)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <button type="button" onClick={() => removeRow(i)}
                className="mb-0.5 rounded px-2 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">{t("material.remove")}</button>
            </div>
          ))}

          <button type="button" onClick={addRow}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium">{t("material.addMaterial")}</button>

          <div className="mb-6">
            <label className="mb-1 block text-xs text-gray-500">{t("material.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {submitting ? "..." : t("material.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/materials/outbound/page.tsx
git commit -m "feat: add Outbound page with customer/project/multi-material form"
```

---

### Task 12: Add Frontend — Customers, Projects, Categories Pages

**Files:**
- Create: `src/app/(dashboard)/materials/customers/page.tsx`
- Create: `src/app/(dashboard)/materials/projects/page.tsx`
- Create: `src/app/(dashboard)/materials/categories/page.tsx`

- [ ] **Step 1: Customers page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

export default function CustomersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/materials/customers").then((r) => r.json()).then(setItems);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ name: "", contact: "", phone: "" });
    setShowForm(true);
    setError("");
  }

  function openEdit(c: any) {
    setEditId(c.id);
    setForm({ name: c.name, contact: c.contact || "", phone: c.phone || "" });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    const url = editId ? `/api/materials/customers/${editId}` : "/api/materials/customers";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Save failed"); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    await fetch(`/api/materials/customers/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.customers")}</h2>
        <button onClick={openNew} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t("material.createCustomer")}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input placeholder={t("material.customerName")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder={t("material.contact")} value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
            <input placeholder={t("material.phone")} value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">Save</button>
            <button onClick={() => setShowForm(false)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.customerName")}</th>
              <th className="px-3 py-2 text-left">{t("material.contact")}</th>
              <th className="px-3 py-2 text-left">{t("material.phone")}</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No customers yet</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-gray-500">{c.contact || "-"}</td>
                <td className="px-3 py-2 text-gray-500">{c.phone || "-"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(c)} className="mr-2 text-sm text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Projects page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

export default function ProjectsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", status: "active" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/materials/projects").then((r) => r.json()).then(setItems);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ name: "", status: "active" });
    setShowForm(true);
    setError("");
  }

  function openEdit(p: any) {
    setEditId(p.id);
    setForm({ name: p.name, status: p.status });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    const url = editId ? `/api/materials/projects/${editId}` : "/api/materials/projects";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Save failed"); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    await fetch(`/api/materials/projects/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.projects")}</h2>
        <button onClick={openNew} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t("material.createProject")}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <div className="flex gap-3 mb-3">
            <input placeholder={t("material.projectName")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm">
              <option value="active">{t("material.active")}</option>
              <option value="archived">{t("material.archived")}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">Save</button>
            <button onClick={() => setShowForm(false)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.projectName")}</th>
              <th className="px-3 py-2 text-left">{t("material.projectStatus")}</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No projects yet</td></tr>
            ) : items.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>{p.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(p)} className="mr-2 text-sm text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Categories page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";

export default function CategoriesPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/materials/categories").then((r) => r.json()).then(setItems);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm({ name: "", parentId: "" });
    setShowForm(true);
    setError("");
  }

  function openEdit(cat: any) {
    setEditId(cat.id);
    setForm({ name: cat.name, parentId: cat.parentId || "" });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    const url = editId ? `/api/materials/categories/${editId}` : "/api/materials/categories";
    const method = editId ? "PUT" : "POST";
    const body: any = { name: form.name };
    if (form.parentId) body.parentId = form.parentId; else if (editId) body.parentId = null;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || "Save failed"); return; }
    setShowForm(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("material.confirmDelete"))) return;
    const res = await fetch(`/api/materials/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t("material.categories")}</h2>
        <button onClick={openNew} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {t("material.createCategory")}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <div className="flex gap-3 mb-3">
            <input placeholder={t("material.categoryName")} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm" />
            <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="rounded border border-slate-200 px-3 py-2 text-sm">
              <option value="">No parent</option>
              {items.filter((c) => c.id !== editId).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="rounded bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700">Save</button>
            <button onClick={() => setShowForm(false)} className="rounded border px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">{t("material.categoryName")}</th>
              <th className="px-3 py-2 text-left">{t("material.parentCategory")}</th>
              <th className="px-3 py-2 text-right">{t("material.materialCount")}</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No categories yet</td></tr>
            ) : items.map((cat) => (
              <tr key={cat.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-medium">{cat.name}</td>
                <td className="px-3 py-2 text-gray-500">{cat.parent?.name || "-"}</td>
                <td className="px-3 py-2 text-right text-gray-500">{cat._count?.materials || 0}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(cat)} className="mr-2 text-sm text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/materials/customers/ src/app/\(dashboard\)/materials/projects/ src/app/\(dashboard\)/materials/categories/
git commit -m "feat: add Customers, Projects, Categories management pages"
```

---

### Task 13: Run Build and Verify

**Files:** None (verification only)

- [ ] **Step 1: Run build**

Stop dev server first, then:

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npx next build
```

Expected: `✓ Compiled successfully` — all pages compile, no type errors, no missing imports.

- [ ] **Step 2: Restart dev server**

```bash
npx next dev -p 3000
```

- [ ] **Step 3: Verify login page and sidebar**

Open `http://localhost:3000/login` — login page unchanged.
Login as admin@company.com — Material Mgmt section visible in sidebar above logout.
Login as user@company.com — Material Mgmt section NOT visible.

- [ ] **Step 4: Commit if all passes**

No files to commit — this task is verification only.

---

### Task 14: Run Prisma db push to sync schema to Neon (with user approval)

**Files:** None (database only)

- [ ] **Step 1: Push schema to Neon**

```bash
npx prisma db push
```

Expected: `The database is already in sync with the Prisma schema.` (or new tables created without data loss).

> **Note:** This step modifies the Neon database schema. Only run after user confirms.

- [ ] **Step 2: Verify tables exist**

Check that `material_categories`, `materials`, `customers`, `projects`, `outbound_orders`, `stock_transactions` tables exist in Neon.
