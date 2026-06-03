# Material Management Module — Design Spec

**Date:** 2026-05-30
**Status:** Approved

## Overview

Add a peer-level Material Management module alongside the existing Expense Management system. Both modules share the same auth, role system, layout shell, and i18n framework but are independent in data models, routes, and sidebar navigation.

## Requirements Summary

- Login page unchanged
- Sidebar: new "Material Mgmt" section above logout, visually separated from "Expense Mgmt"
- Permissions: admin, finance, dept_head, manager can see material menu; employee cannot
- No approval workflow for material operations — authorized users operate directly
- Category + spec inventory model with safety stock warnings
- Pre-maintained customer and project lists for outbound records
- Multi-item outbound orders (one order, multiple material lines)
- UI follows existing patterns (Tailwind, i18n, sidebar nav)

---

## Database Schema

### New Models

```prisma
model MaterialCategory {
  id        String       @id @default(uuid())
  name      String       @unique
  parentId  String?
  parent    MaterialCategory? @relation("CategoryChildren", fields: [parentId], references: [id])
  children  MaterialCategory[] @relation("CategoryChildren")
  materials Material[]
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")

  @@map("material_categories")
}

model Material {
  id           String           @id @default(uuid())
  name         String
  categoryId   String           @map("category_id")
  category     MaterialCategory @relation(fields: [categoryId], references: [id])
  spec         String           @default("")
  unit         String           @default("")
  safetyStock  Float            @default(0) @map("safety_stock")
  currentStock Float            @default(0) @map("current_stock")
  transactions StockTransaction[]
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

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
  id         String            @id @default(uuid())
  customerId String            @map("customer_id")
  customer   Customer          @relation(fields: [customerId], references: [id])
  projectId  String            @map("project_id")
  project    Project           @relation(fields: [projectId], references: [id])
  operatorId String            @map("operator_id")
  operator   User              @relation(fields: [operatorId], references: [id])
  items      Json
  notes      String            @default("")
  cancelled  Boolean           @default(false)
  createdAt  DateTime          @default(now()) @map("created_at")
  updatedAt  DateTime          @updatedAt @map("updated_at")

  @@map("outbound_orders")
}

model StockTransaction {
  id           String    @id @default(uuid())
  materialId   String    @map("material_id")
  material     Material  @relation(fields: [materialId], references: [id])
  type         String
  quantity     Float
  beforeStock  Float     @map("before_stock")
  afterStock   Float     @map("after_stock")
  orderType    String    @map("order_type")
  orderId      String    @map("order_id")
  operatorId   String    @map("operator_id")
  operator     User      @relation(fields: [operatorId], references: [id])
  notes        String    @default("")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([materialId])
  @@index([createdAt])
  @@map("stock_transactions")
}
```

### OutboundOrder.items JSON Shape

```json
[
  { "materialId": "uuid", "name": "A4 Paper", "quantity": 5, "unit": "box" },
  { "materialId": "uuid", "name": "USB Cable", "quantity": 10, "unit": "piece" }
]
```

Denormalized `name` and `unit` for display without joins.

### Inbound Order Handling

Inbound orders (Add Stock) do not need a separate model. The `StockTransaction` with `type: "in"` and `orderType: "inbound"` is sufficient. An inbound form simply creates N StockTransaction rows (one per material line), each linked to the same `orderId` (a shared UUID generated at submit time).

---

## Sidebar Design

New section between existing Expense Mgmt items and logout:

```
┌─────────────────────────┐
│  Expense Mgmt           │
│    My Expenses          │
│    New Expense          │
│    Pending Approvals    │
│    Reports              │
│    Budgets              │
│    Users / Depts (admin)│
├─────────────────────────┤
│  Material Mgmt          │  ← section header, not a link
│    Material Overview    │     /materials
│    Add Stock            │     /materials/inbound
│    Outbound             │     /materials/outbound
│    Customers            │     /materials/customers       [all roles]
│    Projects             │     /materials/projects         [all roles]
│    Categories           │     /materials/categories       [admin/finance/dept_head]
├─────────────────────────┤
│  Sign Out               │
└─────────────────────────┘
```

**Role visibility matrix:**

| Menu item | admin | finance | dept_head | manager | employee |
|-----------|-------|---------|-----------|---------|----------|
| Material Overview | ✓ | ✓ | ✓ | ✓ | - |
| Add Stock | ✓ | ✓ | ✓ | ✓ | - |
| Outbound | ✓ | ✓ | ✓ | ✓ | - |
| Customers | ✓ | ✓ | ✓ | ✓ | - |
| Projects | ✓ | ✓ | ✓ | ✓ | - |
| Categories | ✓ | ✓ | ✓ | - | - |

**Implementation:** The sidebar `MENU_KEYS` array gains new entries with a `section: "materials"` property. Rendering logic groups items by section and inserts a divider + section header between groups. The existing `userRole` prop controls visibility via the existing `roles` array filter.

---

## Pages

### Material Overview (`/materials`)

**Top half — Stock Table:**

| Column | Description |
|--------|-------------|
| Name | Material name |
| Category | Category name |
| Spec | Specification / model |
| Unit | Unit of measure (box, piece, roll, etc.) |
| Stock | Current stock quantity |
| Safety | Safety stock threshold |
| Status | Badge: Normal (green) / Low Stock (yellow, stock ≤ safety) / Out (red, stock = 0) |

Features: search by name, filter by category (dropdown), sort by columns.

**Bottom half — Recent Transactions Table:**

| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Type | Badge: In (green) / Out (blue) / Void (gray, for cancelled orders) |
| Material | Material name |
| Qty | Quantity moved |
| Stock After | Stock level after transaction |
| Operator | Who performed the operation |
| Customer | Customer name (outbound only, "-" for inbound) |
| Project | Project name (outbound only, "-" for inbound) |
| Notes | Brief notes or "-" |

Features: paginated, date range filter, type filter (All / In / Out).

### Add Stock (`/materials/inbound`)

Form with dynamic rows:
- "Add Row" button to add material lines
- Each row: material select (searchable dropdown), quantity input
- Notes textarea
- Submit: validates quantities > 0, atomically creates StockTransaction rows and updates Material.currentStock

### Outbound (`/materials/outbound`)

Form with header + rows:
- Header: Customer select, Project select
- Rows: material select + quantity (dynamic add/remove)
- Notes textarea
- Submit: validates stock sufficiency per material, atomically creates OutboundOrder + StockTransaction rows, decrements Material.currentStock

**Cancel outbound:** Clicking "Cancel" on an outbound order in the transaction list reverses the stock change (creates compensating StockTransaction rows) and marks the OutboundOrder as `cancelled: true`.

### Customers (`/materials/customers`)

Table: Name, Contact, Phone, Created At. Add/Edit/Delete actions.

### Projects (`/materials/projects`)

Table: Name, Status (active/archived), Created At. Add/Edit/Archive actions.

### Categories (`/materials/categories`)

Table: Name, Parent Category, Material Count. Add/Edit/Delete actions. Delete blocked if category has materials.

---

## File Structure

```
src/app/(dashboard)/
  materials/
    page.tsx                  Material Overview
    inbound/page.tsx           Add Stock form
    outbound/page.tsx          Outbound form
    customers/page.tsx         Customer management
    projects/page.tsx          Project management
    categories/page.tsx        Category management

src/app/api/
  materials/route.ts           GET stock list, POST create material
  materials/[id]/route.ts      GET/PUT/DELETE single material
  materials/transactions/route.ts     GET transactions (paginated, filtered)
  materials/customers/route.ts        GET all, POST create
  materials/customers/[id]/route.ts   PUT/DELETE customer
  materials/projects/route.ts         GET all, POST create
  materials/projects/[id]/route.ts    PUT/DELETE project
  materials/categories/route.ts       GET all, POST create
  materials/categories/[id]/route.ts  PUT/DELETE category
  materials/inbound/route.ts    POST inbound (multi-material)
  materials/outbound/route.ts          POST outbound
  materials/outbound/[id]/route.ts     PUT cancel outbound

src/services/
  material.service.ts

prisma/schema.prisma     +6 models
src/i18n/dictionaries.ts  +material.* section (~30 keys)
src/components/layout/sidebar.tsx  +material section
src/middleware.ts         extend protected paths to include /materials
```

---

## i18n Keys

New section in both en and zh dictionaries:

```
material.overview, material.addStock, material.outbound,
material.customers, material.projects, material.categories,
material.name, material.category, material.spec, material.unit,
material.currentStock, material.safetyStock, material.status,
material.normal, material.low, material.out, material.inbound, material.outbound,
material.transactionHistory, material.recentTransactions,
material.selectCustomer, material.selectProject, material.quantity,
material.notes, material.addMaterial, material.remove,
material.customerName, material.contact, material.phone,
material.projectName, material.projectStatus, material.active, material.archived,
material.categoryName, material.parentCategory, material.materialCount,
material.confirmDelete, material.cancelOrder, material.insufficientStock,
material.submit, material.sidebarTitle
```

---

## Middleware Update

Add `/materials` to `protectedPaths` array. API paths `/api/materials` are also protected.

---

## API Access Control

All `/api/materials/*` endpoints must reject requests from users with role `employee`. Return HTTP 403 with message `"Insufficient permissions"`. This is enforced via a helper check at the top of each route handler, following the same pattern as `requireAuth()` in `src/lib/auth-helpers.ts`.

---

## Constraints & Assumptions

- No approval workflow for material operations (confirmed)
- JSON items for order lines instead of a separate items table
- Stock transactions are immutable — cancellation creates compensating entries, never deletes
- All material operations are web-only (no mobile-first priority for this module)
- Category parentId supports one level of nesting only
