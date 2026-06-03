# 费用管理系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建公司内部费用管理系统 — 支持 PC/移动端、费用申请、多级审批、财务放款、预算管理、报表统计

**Architecture:** Next.js App Router 单体全栈，PC 端侧边栏布局 + 移动端底部 Tab 响应式布局，同一套 API Routes 为两端服务。Prisma ORM 操作 PostgreSQL，NextAuth.js JWT 鉴权，Tailwind CSS 样式

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL, Prisma, NextAuth.js, Tailwind CSS, Vitest, Playwright, Zod

---

## 第一阶段：项目搭建

### Task 1: 初始化 Next.js 项目

**Files:**
- Create: 项目根目录所有脚手架文件

- [ ] **Step 1: 创建 Next.js 项目**

```bash
cd "/e/CC workspace/费用管理"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: 安装核心依赖**

```bash
cd "/e/CC workspace/费用管理"
npm install next-auth@beta @prisma/client zod bcryptjs
npm install -D prisma @types/bcryptjs vitest @vitejs/plugin-react playwright @playwright/test
```

- [ ] **Step 3: 初始化 Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

确认生成 `prisma/schema.prisma` 和 `.env` 文件。

- [ ] **Step 4: 配置 .env**

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_management?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="uploads"
```

- [ ] **Step 5: 创建项目目录结构**

```bash
mkdir -p src/app/"(dashboard)"/{expenses/new/'[id]',approvals/'[id]',budgets,reports,settings/{users,departments}}
mkdir -p src/app/"(mobile)"/{apply,approval,profile}
mkdir -p src/app/api/auth/'[...nextauth]'
mkdir -p src/app/api/expenses/'[id]'/pay
mkdir -p src/app/api/approvals/'[id]'/{approve,reject,return}
mkdir -p src/app/api/budgets
mkdir -p src/app/api/reports/{summary,by-department}
mkdir -p src/app/api/upload
mkdir -p src/app/login
mkdir -p src/{components/{ui,layout,expenses,approvals,budgets,reports},services,lib,types}
mkdir -p uploads
```

- [ ] **Step 6: 验证项目启动**

```bash
npm run dev
```

访问 http://localhost:3000 确认 Next.js 默认页面显示正常。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with dependencies and directory structure"
```

---

### Task 2: 配置 Prisma Schema 和数据库迁移

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: 编写 Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  employee
  manager
  dept_head
  finance
  admin
}

enum ExpenseType {
  travel
  procurement
  entertainment
  general
}

enum ExpenseStatus {
  draft
  submitted
  level1_approval
  level2_approval
  countersign
  finance_review
  approved
  paid
  rejected
  withdrawn
}

enum ApprovalLevel {
  level1
  level2
  finance
  countersign
}

enum ApprovalAction {
  approved
  rejected
  returned
}

model User {
  id           String       @id @default(uuid())
  name         String
  email        String       @unique
  passwordHash String       @map("password_hash")
  departmentId String       @map("department_id")
  department   Department   @relation(fields: [departmentId], references: [id])
  role         UserRole     @default(employee)
  managerId    String?      @map("manager_id")
  manager      User?        @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates User[]       @relation("ManagerSubordinates")
  expenses     Expense[]    @relation("Applicant")
  approvals    ApprovalRecord[] @relation("Approver")
  managedDept  Department?  @relation("Head")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  @@map("users")
}

model Department {
  id        String   @id @default(uuid())
  name      String   @unique
  headId    String?  @map("head_id")
  head      User?    @relation("Head", fields: [headId], references: [id])
  users     User[]
  budgets   Budget[]
  expenses  Expense[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("departments")
}

model Budget {
  id           String     @id @default(uuid())
  departmentId String     @map("department_id")
  department   Department @relation(fields: [departmentId], references: [id])
  year         Int
  totalAmount  Decimal    @map("total_amount") @db.Decimal(12, 2)
  usedAmount   Decimal    @default(0) @map("used_amount") @db.Decimal(12, 2)
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@unique([departmentId, year])
  @@map("budgets")
}

model Expense {
  id               String           @id @default(uuid())
  applicantId      String           @map("applicant_id")
  applicant        User             @relation("Applicant", fields: [applicantId], references: [id])
  departmentId     String           @map("department_id")
  department       Department       @relation(fields: [departmentId], references: [id])
  type             ExpenseType
  title            String
  description      String           @db.Text
  amount           Decimal          @db.Decimal(12, 2)
  expenseDate      DateTime         @map("expense_date") @db.Date
  status           ExpenseStatus    @default(draft)
  currentApproverId String?         @map("current_approver_id")
  currentApprover  User?            @relation("CurrentApprover", fields: [currentApproverId], references: [id])
  approvalRecords  ApprovalRecord[]
  attachments      Attachment[]
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@map("expenses")
}

model ApprovalRecord {
  id         String          @id @default(uuid())
  expenseId  String          @map("expense_id")
  expense    Expense         @relation(fields: [expenseId], references: [id])
  approverId String          @map("approver_id")
  approver   User            @relation("Approver", fields: [approverId], references: [id])
  level      ApprovalLevel
  status     String          @default("pending")
  action     ApprovalAction?
  comment    String?         @db.Text
  actedAt    DateTime?       @map("acted_at")
  createdAt  DateTime        @default(now()) @map("created_at")

  @@map("approval_records")
}

model Attachment {
  id        String   @id @default(uuid())
  expenseId String   @map("expense_id")
  expense   Expense  @relation(fields: [expenseId], references: [id])
  filename  String
  url       String
  size      Int
  mimeType  String   @map("mime_type")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("attachments")
}
```

- [ ] **Step 2: 创建 Prisma Client 单例**

`src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: 运行数据库迁移**

```bash
npx prisma migrate dev --name init
```

Expected: 数据库表创建成功，`prisma/migrations/` 目录生成迁移文件。

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts prisma/migrations/
git commit -m "feat: define Prisma schema and run initial migration"
```

---

## 第二阶段：鉴权系统

### Task 3: 实现共享类型和错误类

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/errors.ts`
- Create: `src/lib/validation.ts`

- [ ] **Step 1: 定义共享类型**

`src/types/index.ts`:
```typescript
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "employee" | "manager" | "dept_head" | "finance" | "admin";
  departmentId: string;
}

export interface ExpenseListItem {
  id: string;
  title: string;
  type: string;
  amount: string;
  status: string;
  applicantName: string;
  departmentName: string;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseDetail extends ExpenseListItem {
  description: string;
  currentApproverName?: string;
  approvalRecords: ApprovalRecordItem[];
  attachments: AttachmentItem[];
}

export interface ApprovalRecordItem {
  id: string;
  level: string;
  approverName: string;
  status: string;
  action?: string;
  comment?: string;
  actedAt?: string;
}

export interface AttachmentItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

- [ ] **Step 2: 定义错误类**

`src/lib/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, "BAD_REQUEST", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "请先登录") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "无权操作") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
```

- [ ] **Step 3: 定义 Zod 校验 Schema**

`src/lib/validation.ts`:
```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少6位"),
});

export const expenseSchema = z.object({
  type: z.enum(["travel", "procurement", "entertainment", "general"]),
  title: z.string().min(1, "标题不能为空").max(100),
  description: z.string().min(1, "事由不能为空").max(2000),
  amount: z.coerce.number().positive("金额必须大于0"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式错误"),
});

export const approvalCommentSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const budgetSchema = z.object({
  departmentId: z.string().uuid(),
  year: z.number().int().min(2020).max(2100),
  totalAmount: z.coerce.number().positive("拨款金额必须大于0"),
});
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/lib/errors.ts src/lib/validation.ts
git commit -m "feat: add shared types, error classes, and Zod validation schemas"
```

---

### Task 4: 实现 NextAuth 配置和 AuthService

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/services/auth.service.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: 编写 NextAuth 配置**

`src/lib/auth.ts`:
```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.departmentId = token.departmentId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 2: 编写 NextAuth Route Handler**

`src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: 编写 AuthService**

`src/services/auth.service.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn } from "@/lib/auth";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import type { SessionUser } from "@/types";

export class AuthService {
  async login(email: string, password: string) {
    return signIn("credentials", { email, password, redirect: false });
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    departmentId: string;
    role: string;
    managerId?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestError("该邮箱已被注册");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        departmentId: data.departmentId,
        role: data.role as any,
        managerId: data.managerId || null,
      },
    });

    return { id: user.id, name: user.name, email: user.email };
  }

  async getCurrentUser(userId: string): Promise<SessionUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) throw new UnauthorizedError("用户不存在");

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as SessionUser["role"],
      departmentId: user.departmentId,
    };
  }
}

export const authService = new AuthService();
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/services/auth.service.ts src/app/api/auth/
git commit -m "feat: implement NextAuth JWT auth with credentials provider"
```

---

### Task 5: 实现鉴权中间件和主布局

**Files:**
- Create: `src/middleware.ts`
- Create: `src/lib/auth-helpers.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: 编写鉴权中间件**

`src/middleware.ts`:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const protectedPaths = ["/expenses", "/approvals", "/budgets", "/reports", "/settings", "/apply", "/approval", "/profile"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const authApiPaths = ["/api/expenses", "/api/approvals", "/api/budgets", "/api/reports", "/api/upload"];
  const isAuthApi = authApiPaths.some((p) => pathname.startsWith(p));

  if (isAuthApi && !isLoggedIn) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "请先登录" } }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};
```

- [ ] **Step 2: 编写 getSession 工具函数**

`src/lib/auth-helpers.ts`:
```typescript
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session.user as { id: string; name: string; email: string; role: string; departmentId: string };
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedError("无权访问");
  }
  return user;
}
```

- [ ] **Step 3: 编写根布局和全局样式**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "费用管理系统",
  description: "公司内部费用管理平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/lib/auth-helpers.ts src/app/layout.tsx src/app/globals.css
git commit -m "feat: add auth middleware, helpers, and root layout"
```

---

### Task 6: 实现登录页

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: 编写登录页面组件**

`src/app/login/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("邮箱或密码错误");
    } else {
      router.push("/expenses");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">费用管理系统</h1>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page with credentials auth"
```

---

## 第三阶段：核心服务层

### Task 7: 实现 ExpenseService

**Files:**
- Create: `src/services/expense.service.ts`

- [ ] **Step 1: 编写 ExpenseService**

`src/services/expense.service.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";
import { ExpenseStatus, Prisma } from "@prisma/client";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["level1_approval"],
  level1_approval: ["level2_approval", "rejected"],
  level2_approval: ["countersign", "finance_review", "rejected"],
  countersign: ["finance_review", "rejected"],
  finance_review: ["approved", "rejected"],
  approved: ["paid"],
  rejected: ["submitted"],
};

export class ExpenseService {
  async list(params: {
    userId: string;
    role: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.ExpenseWhereInput = {};

    if (params.role === "employee") {
      where.applicantId = params.userId;
    } else if (params.role === "manager" || params.role === "dept_head") {
      const user = await prisma.user.findUnique({ where: { id: params.userId } });
      if (user) {
        where.departmentId = user.departmentId;
      }
    }

    if (params.status && params.status !== "all") {
      where.status = params.status as ExpenseStatus;
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

    if (!expense) throw new NotFoundError("申请不存在");

    if (role === "employee" && expense.applicantId !== userId) {
      throw new ForbiddenError();
    }

    return {
      id: expense.id,
      title: expense.title,
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
    description: string;
    amount: number;
    expenseDate: string;
    userId: string;
    departmentId: string;
    isDraft: boolean;
  }) {
    const expense = await prisma.expense.create({
      data: {
        type: data.type as any,
        title: data.title,
        description: data.description,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate),
        applicantId: data.userId,
        departmentId: data.departmentId,
        status: data.isDraft ? "draft" : "submitted",
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
  }) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError("申请不存在");
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status !== "draft" && expense.status !== "rejected") {
      throw new ConflictError("当前状态不可修改");
    }

    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.type && { type: data.type as any }),
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.amount && { amount: data.amount }),
        ...(data.expenseDate && { expenseDate: new Date(data.expenseDate) }),
      },
    });
  }

  async submit(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status !== "draft" && expense.status !== "rejected") {
      throw new ConflictError("当前状态不可提交");
    }

    await prisma.expense.update({ where: { id }, data: { status: "submitted" } });
    await this.buildApprovalChain(id, Number(expense.amount), userId);
  }

  async delete(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status !== "draft") throw new ConflictError("只能删除草稿");

    await prisma.expense.delete({ where: { id } });
  }

  private async buildApprovalChain(expenseId: string, amount: number, applicantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      include: { department: { include: { head: true } } },
    });

    if (!user?.managerId) throw new ConflictError("未设置直属主管，无法提交审批");

    const steps: { approverId: string; level: string }[] = [];

    // level1: 直属主管
    steps.push({ approverId: user.managerId, level: "level1" });

    // level2: 部门负责人
    if (user.department.headId && user.department.headId !== user.managerId) {
      steps.push({ approverId: user.department.headId, level: "level2" });
    }

    // countersign: > 10000 加签
    if (amount > 10000) {
      const financeUsers = await prisma.user.findMany({
        where: { role: "finance" },
        take: 1,
      });
      if (financeUsers.length > 0) {
        steps.push({ approverId: financeUsers[0].id, level: "countersign" });
      }
    }

    // finance
    const financeUsers = await prisma.user.findMany({
      where: { role: "finance" },
      take: 1,
    });
    if (financeUsers.length > 0) {
      steps.push({ approverId: financeUsers[0].id, level: "finance" });
    }

    if (steps.length === 0) throw new ConflictError("未找到审批人");

    await prisma.$transaction(async (tx) => {
      for (const step of steps) {
        await tx.approvalRecord.create({
          data: {
            expenseId,
            approverId: step.approverId,
            level: step.level,
            status: step === steps[0] ? "pending" : "pending",
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
    });
  }

  async withdraw(id: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundError();
    if (expense.applicantId !== userId) throw new ForbiddenError();
    if (expense.status === "paid") throw new ConflictError("已放款不可撤回");

    await prisma.expense.update({
      where: { id },
      data: { status: "withdrawn", currentApproverId: null },
    });
  }
}

export const expenseService = new ExpenseService();
```

- [ ] **Step 2: Commit**

```bash
git add src/services/expense.service.ts
git commit -m "feat: implement ExpenseService with CRUD and approval chain builder"
```

---

### Task 8: 实现 ApprovalService

**Files:**
- Create: `src/services/approval.service.ts`

- [ ] **Step 1: 编写 ApprovalService**

`src/services/approval.service.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";

export class ApprovalService {
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
      applicantName: r.expense.applicant.name,
      departmentName: r.expense.department.name,
      expenseDate: r.expense.expenseDate.toISOString().split("T")[0],
      level: r.level,
    }));
  }

  async approve(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true },
    });

    if (!record) throw new NotFoundError("审批记录不存在");
    if (record.approverId !== userId) throw new ForbiddenError("您不是当前审批人");
    if (record.status !== "pending") throw new ConflictError("该审批已完成");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "approved", comment, actedAt: new Date() },
      });

      await this.advanceToNextStep(tx, record.expenseId);
    });
  }

  async reject(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true },
    });

    if (!record) throw new NotFoundError("审批记录不存在");
    if (record.approverId !== userId) throw new ForbiddenError("您不是当前审批人");
    if (record.status !== "pending") throw new ConflictError("该审批已完成");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "rejected", comment, actedAt: new Date() },
      });

      await tx.expense.update({
        where: { id: record.expenseId },
        data: { status: "rejected", currentApproverId: null },
      });
    });
  }

  async returnForRevision(recordId: string, userId: string, comment?: string) {
    const record = await prisma.approvalRecord.findUnique({
      where: { id: recordId },
      include: { expense: true },
    });

    if (!record) throw new NotFoundError("审批记录不存在");
    if (record.approverId !== userId) throw new ForbiddenError("您不是当前审批人");
    if (record.status !== "pending") throw new ConflictError("该审批已完成");

    await prisma.$transaction(async (tx) => {
      await tx.approvalRecord.update({
        where: { id: recordId },
        data: { status: "completed", action: "returned", comment, actedAt: new Date() },
      });

      await tx.expense.update({
        where: { id: record.expenseId },
        data: { status: "rejected", currentApproverId: null },
      });
    });
  }

  private async advanceToNextStep(tx: any, expenseId: string) {
    const nextPending = await tx.approvalRecord.findFirst({
      where: { expenseId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!nextPending) {
      const allApproved = await tx.approvalRecord.count({
        where: { expenseId, action: { not: "approved" } },
      });
      if (allApproved === 0) {
        await tx.expense.update({
          where: { id: expenseId },
          data: { status: "approved", currentApproverId: null },
        });
      }
      return;
    }

    const STATUS_MAP: Record<string, string> = {
      level1: "level1_approval",
      level2: "level2_approval",
      countersign: "countersign",
      finance: "finance_review",
    };

    await tx.approvalRecord.update({
      where: { id: nextPending.id },
      data: { status: "pending" },
    });

    await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: STATUS_MAP[nextPending.level] || nextPending.level,
        currentApproverId: nextPending.approverId,
      },
    });
  }

  async markAsPaid(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundError();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "finance") throw new ForbiddenError("仅财务可放款");
    if (expense.status !== "approved") throw new ConflictError("仅已通过申请可放款");

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { status: "paid" },
      });

      const budget = await tx.budget.findFirst({
        where: { departmentId: expense.departmentId, year: new Date().getFullYear() },
      });
      if (budget) {
        await tx.budget.update({
          where: { id: budget.id },
          data: { usedAmount: { increment: expense.amount } },
        });
      }
    });
  }
}

export const approvalService = new ApprovalService();
```

- [ ] **Step 2: Commit**

```bash
git add src/services/approval.service.ts
git commit -m "feat: implement ApprovalService with multi-level approval and payment"
```

---

### Task 9: 实现 BudgetService 和 ReportService

**Files:**
- Create: `src/services/budget.service.ts`
- Create: `src/services/report.service.ts`

- [ ] **Step 1: 编写 BudgetService**

`src/services/budget.service.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";

export class BudgetService {
  async list(departmentId?: string, year?: number) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (year) where.year = year;

    return prisma.budget.findMany({
      where,
      include: { department: { select: { name: true } } },
      orderBy: { year: "desc" },
    });
  }

  async createOrUpdate(data: { departmentId: string; year: number; totalAmount: number }) {
    const existing = await prisma.budget.findUnique({
      where: { departmentId_year: { departmentId: data.departmentId, year: data.year } },
    });

    if (existing) {
      return prisma.budget.update({
        where: { id: existing.id },
        data: { totalAmount: data.totalAmount },
      });
    }

    return prisma.budget.create({ data });
  }

  async getDepartmentBudget(departmentId: string, year: number) {
    const budget = await prisma.budget.findUnique({
      where: { departmentId_year: { departmentId, year } },
    });
    return budget ? { ...budget, totalAmount: budget.totalAmount.toString(), usedAmount: budget.usedAmount.toString() } : null;
  }
}

export const budgetService = new BudgetService();
```

- [ ] **Step 2: 编写 ReportService**

`src/services/report.service.ts`:
```typescript
import { prisma } from "@/lib/prisma";

export class ReportService {
  async getPersonalSummary(userId: string, year: number) {
    const expenses = await prisma.expense.findMany({
      where: { applicantId: userId, expenseDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const e of expenses) {
      byType[e.type] = (byType[e.type] || 0) + Number(e.amount);
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    return { totalAmount, count: expenses.length, byType, byStatus };
  }

  async getDepartmentSummary(year: number) {
    const departments = await prisma.department.findMany({
      include: {
        expenses: { where: { expenseDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } },
        budgets: { where: { year } },
      },
    });

    return departments.map((d) => {
      const totalExpense = d.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const budget = d.budgets[0];
      return {
        departmentId: d.id,
        departmentName: d.name,
        totalExpense,
        budgetTotal: budget ? Number(budget.totalAmount) : 0,
        budgetUsed: budget ? Number(budget.usedAmount) : 0,
        expenseCount: d.expenses.length,
      };
    });
  }
}

export const reportService = new ReportService();
```

- [ ] **Step 3: Commit**

```bash
git add src/services/budget.service.ts src/services/report.service.ts
git commit -m "feat: implement BudgetService and ReportService"
```

---

## 第四阶段：API 路由

### Task 10: 实现 Expenses API

**Files:**
- Create: `src/app/api/expenses/route.ts`
- Create: `src/app/api/expenses/[id]/route.ts`

- [ ] **Step 1: 编写 GET + POST `/api/expenses`**

`src/app/api/expenses/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { expenseService } from "@/services/expense.service";
import { requireAuth } from "@/lib/auth-helpers";
import { expenseSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await expenseService.list({
      userId: user.id, role: user.role, status, page, pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const isDraft = body.isDraft === true;

    const data = expenseSchema.parse(body);
    const result = await expenseService.create({
      ...data, userId: user.id, departmentId: user.departmentId, isDraft,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: err.errors[0].message } }, { status: 400 });
  }
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "服务器错误" } }, { status: 500 });
}
```

- [ ] **Step 2: 编写 GET + PUT + DELETE `/api/expenses/[id]`**

`src/app/api/expenses/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { expenseService } from "@/services/expense.service";
import { requireAuth } from "@/lib/auth-helpers";
import { AppError } from "@/lib/errors";
import { ZodError } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const result = await expenseService.getById(params.id, user.id, user.role);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const result = await expenseService.update(params.id, user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await expenseService.delete(params.id, user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: err.errors[0].message } }, { status: 400 });
  }
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.statusCode });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "服务器错误" } }, { status: 500 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/expenses/
git commit -m "feat: implement expenses API routes (list/create/get/update/delete)"
```

---

### Task 11: 实现 Approvals API

**Files:**
- Create: `src/app/api/approvals/pending/route.ts`
- Create: `src/app/api/approvals/[id]/approve/route.ts`
- Create: `src/app/api/approvals/[id]/reject/route.ts`
- Create: `src/app/api/approvals/[id]/return/route.ts`
- Create: `src/app/api/expenses/[id]/pay/route.ts`

- [ ] **Step 1: 编写待审批列表 API**

`src/app/api/approvals/pending/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest) {
  const user = await requireAuth();
  const list = await approvalService.getPending(user.id);
  return NextResponse.json(list);
}
```

- [ ] **Step 2: 编写审批操作 API**

`src/app/api/approvals/[id]/approve/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  const { comment } = await req.json().catch(() => ({}));
  await approvalService.approve(params.id, user.id, comment);
  return NextResponse.json({ success: true });
}
```

`src/app/api/approvals/[id]/reject/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  const { comment } = await req.json().catch(() => ({}));
  await approvalService.reject(params.id, user.id, comment);
  return NextResponse.json({ success: true });
}
```

`src/app/api/approvals/[id]/return/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  const { comment } = await req.json().catch(() => ({}));
  await approvalService.returnForRevision(params.id, user.id, comment);
  return NextResponse.json({ success: true });
}
```

`src/app/api/expenses/[id]/pay/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { approvalService } from "@/services/approval.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth();
  await approvalService.markAsPaid(id, user.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/approvals/
git commit -m "feat: implement approvals API routes (pending/approve/reject/return/pay)"
```

---

### Task 12: 实现 Budgets、Reports、Upload API

**Files:**
- Create: `src/app/api/budgets/route.ts`
- Create: `src/app/api/reports/summary/route.ts`
- Create: `src/app/api/reports/by-department/route.ts`
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: 编写 Budgets API**

`src/app/api/budgets/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { budgetService } from "@/services/budget.service";
import { requireAuth } from "@/lib/auth-helpers";
import { budgetSchema } from "@/lib/validation";
import { ForbiddenError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId") || undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const list = await budgetService.list(departmentId, year);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role !== "finance" && user.role !== "admin") throw new ForbiddenError("仅财务和管理员可操作");

  const body = await req.json();
  const data = budgetSchema.parse(body);
  const result = await budgetService.createOrUpdate(data);
  return NextResponse.json(result, { status: 201 });
}
```

- [ ] **Step 2: 编写 Reports API**

`src/app/api/reports/summary/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const result = await reportService.getPersonalSummary(user.id, year);
  return NextResponse.json(result);
}
```

`src/app/api/reports/by-department/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { reportService } from "@/services/report.service";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const result = await reportService.getDepartmentSummary(year);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: 编写 Upload API**

`src/app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { BadRequestError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) throw new BadRequestError("未上传文件");
  if (!ALLOWED_TYPES.includes(file.type)) throw new BadRequestError("仅支持 jpg/png/pdf");
  if (file.size > MAX_SIZE) throw new BadRequestError("文件不能超过 10MB");

  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads");
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  });
}
```

- [ ] **Step 4: 编写 Register API**

`src/app/api/auth/register/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { requireRole } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  await requireRole(["admin"]);
  const body = await req.json();
  const user = await authService.register(body);
  return NextResponse.json(user, { status: 201 });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/budgets/ src/app/api/reports/ src/app/api/upload/ src/app/api/auth/register/
git commit -m "feat: implement budgets, reports, upload, and register APIs"
```

---

## 第五阶段：前端组件和页面

### Task 13: 实现共享 UI 组件

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/modal.tsx`
- Create: `src/components/ui/badge.tsx`

- [ ] **Step 1: 编写 Button、Input、Badge、Modal**

`src/components/ui/button.tsx`:
```typescript
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "secondary";
  size?: "sm" | "md";
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base = "rounded font-medium transition-colors disabled:opacity-50";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border",
  };
  return <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props} />;
}
```

`src/components/ui/badge.tsx`:
```typescript
interface BadgeProps { status: string; }

const COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700",
  level1_approval: "bg-yellow-100 text-yellow-700", level2_approval: "bg-yellow-100 text-yellow-700",
  countersign: "bg-purple-100 text-purple-700", finance_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700", paid: "bg-green-200 text-green-800",
  rejected: "bg-red-100 text-red-700", withdrawn: "bg-gray-100 text-gray-500",
};

const LABELS: Record<string, string> = {
  draft: "草稿", submitted: "已提交", level1_approval: "主管审批中",
  level2_approval: "部门负责人审批中", countersign: "加签中", finance_review: "财务复核中",
  approved: "已通过", paid: "已放款", rejected: "已驳回", withdrawn: "已撤回",
};

export function Badge({ status }: BadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] || "bg-gray-100"}`}>
      {LABELS[status] || status}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI components (Button, Badge)"
```

---

### Task 14: 实现 PC 端侧边栏布局

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: 编写 Sidebar 组件**

`src/components/layout/sidebar.tsx`:
```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const MENU_ITEMS = [
  { href: "/expenses", label: "我的申请", roles: ["employee", "manager", "dept_head", "finance", "admin"] },
  { href: "/expenses/new", label: "新建申请", roles: ["employee", "manager", "dept_head", "finance", "admin"] },
  { href: "/approvals", label: "待我审批", roles: ["manager", "dept_head", "finance"] },
  { href: "/reports", label: "费用报表", roles: ["employee", "manager", "dept_head", "finance", "admin"] },
  { href: "/budgets", label: "预算管理", roles: ["finance", "admin"] },
  { href: "/settings/users", label: "用户管理", roles: ["admin"] },
  { href: "/settings/departments", label: "部门管理", roles: ["admin"] },
];

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-56 flex-col bg-slate-800 text-white">
      <div className="border-b border-slate-700 px-4 py-5">
        <h1 className="text-lg font-bold">费用管理</h1>
        <p className="mt-1 text-xs text-slate-400">内部管理系统</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {MENU_ITEMS.filter((item) => item.roles.includes(userRole)).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mb-0.5 block rounded px-3 py-2 text-sm transition-colors ${
              pathname === item.href ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-700 px-3 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写 Dashboard 布局**

`src/app/(dashboard)/layout.tsx`:
```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={(session.user as any).role || "employee"} />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat: implement PC dashboard sidebar layout"
```

---

### Task 15: 实现费用申请列表和新建页面

**Files:**
- Create: `src/app/(dashboard)/expenses/page.tsx`
- Create: `src/app/(dashboard)/expenses/new/page.tsx`
- Create: `src/components/expenses/expense-form.tsx`

- [ ] **Step 1: 编写费用列表页**

`src/app/(dashboard)/expenses/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpenseListItem } from "@/types";

export default function ExpensesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/expenses?status=${status}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .finally(() => setLoading(false));
  }, [status]);

  const STATUS_TABS = [
    { key: "all", label: "全部" }, { key: "draft", label: "草稿" },
    { key: "submitted", label: "审批中" }, { key: "approved,paid", label: "已通过" },
    { key: "rejected", label: "已驳回" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">我的申请</h2>
        <Button onClick={() => router.push("/expenses/new")}>新建申请</Button>
      </div>
      <div className="mb-4 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`rounded-full px-3 py-1 text-sm ${status === tab.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">暂无申请记录</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/expenses/${item.id}`)}
              className="cursor-pointer rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-sm text-gray-500">{item.type} · {item.expenseDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={item.status} />
                  <span className="font-semibold">¥{Number(item.amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 编写费用表单组件**

`src/components/expenses/expense-form.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const EXPENSE_TYPES = [
  { value: "travel", label: "差旅报销" },
  { value: "procurement", label: "办公采购" },
  { value: "entertainment", label: "业务招待" },
  { value: "general", label: "通用费用" },
];

export function ExpenseForm() {
  const router = useRouter();
  const [form, setForm] = useState({ type: "travel", title: "", description: "", amount: "", expenseDate: new Date().toISOString().split("T")[0] });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(isDraft: boolean) {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDraft }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "提交失败");
        return;
      }
      router.push("/expenses");
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">新建费用申请</h2>
      {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">费用类型</label>
          <div className="flex gap-2">
            {EXPENSE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setForm({ ...form, type: t.value })}
                className={`rounded border px-4 py-2 text-sm ${form.type === t.value ? "border-blue-600 bg-blue-50 text-blue-700" : "hover:bg-gray-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">标题</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="如：北京出差交通费" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">金额 (元)</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="0.00" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">费用日期</label>
            <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">事由说明</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="详细描述费用用途..." />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={submitting}>保存草稿</Button>
          <Button onClick={() => handleSubmit(false)} disabled={submitting}>提交申请</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 新建申请页面**

`src/app/(dashboard)/expenses/new/page.tsx`:
```typescript
import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  return <ExpenseForm />;
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/expenses/" src/components/expenses/expense-form.tsx
git commit -m "feat: implement expense list and new expense form pages"
```

---

### Task 16: 实现费用详情页和审批页

**Files:**
- Create: `src/app/(dashboard)/expenses/[id]/page.tsx`
- Create: `src/app/(dashboard)/approvals/page.tsx`
- Create: `src/app/(dashboard)/approvals/[id]/page.tsx`

- [ ] **Step 1: 编写费用详情页**

`src/app/(dashboard)/expenses/[id]/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpenseDetail } from "@/types";

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => r.json())
      .then(setExpense)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500">加载中...</p>;
  if (!expense) return <p className="text-gray-500">申请不存在</p>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; 返回</button>
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{expense.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {expense.applicantName} · {expense.departmentName} · {expense.expenseDate}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">¥{Number(expense.amount).toLocaleString()}</p>
            <Badge status={expense.status} />
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2">事由说明</h3>
          <p className="text-gray-600 whitespace-pre-wrap">{expense.description}</p>
        </div>
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-3">审批进度</h3>
          <div className="space-y-2">
            {expense.approvalRecords.map((record) => (
              <div key={record.id} className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full ${record.action === "approved" ? "bg-green-500" : record.action === "rejected" ? "bg-red-500" : "bg-gray-300"}`} />
                <span className="font-medium">{record.approverName}</span>
                <span className="text-gray-500">({record.level})</span>
                {record.action ? <span className={`${record.action === "approved" ? "text-green-600" : "text-red-600"}`}>{record.action === "approved" ? "已通过" : record.action === "rejected" ? "已驳回" : "已退回"}</span> : <span className="text-yellow-600">待审批</span>}
                {record.actedAt && <span className="text-gray-400 text-xs">{new Date(record.actedAt).toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
        {expense.attachments.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">附件</h3>
            <div className="flex flex-wrap gap-2">
              {expense.attachments.map((a) => (
                <a key={a.id} href={a.url} target="_blank" className="text-sm text-blue-600 hover:underline">{a.filename}</a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写审批列表页**

`src/app/(dashboard)/approvals/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ApprovalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/approvals/pending")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(recordId: string, expenseId: string, action: string) {
    const comment = action !== "approve" ? prompt("请输入审批意见（可选）：") || "" : "";
    const res = await fetch(`/api/approvals/${recordId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== recordId));
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">待我审批</h2>
      {loading ? <p className="text-gray-500">加载中...</p> :
       items.length === 0 ? <p className="text-gray-500">暂无待审批申请</p> :
       <div className="space-y-3">
         {items.map((item) => (
           <div key={item.id} className="rounded-lg bg-white p-4 shadow-sm">
             <div className="flex items-center justify-between mb-2">
               <div>
                 <span className="font-medium cursor-pointer hover:text-blue-600" onClick={() => router.push(`/expenses/${item.expenseId}`)}>{item.expenseTitle}</span>
                 <span className="ml-2 text-sm text-gray-500">{item.applicantName} · {item.departmentName}</span>
               </div>
               <span className="font-semibold">¥{Number(item.amount).toLocaleString()}</span>
             </div>
             <div className="flex items-center justify-between">
               <span className="text-sm text-gray-500">{item.expenseType} · {item.expenseDate}</span>
               <div className="flex gap-2">
                 <Button variant="danger" size="sm" onClick={() => handleAction(item.id, item.expenseId, "reject")}>驳回</Button>
                 <Button variant="secondary" size="sm" onClick={() => handleAction(item.id, item.expenseId, "return")}>退回</Button>
                 <Button size="sm" onClick={() => handleAction(item.id, item.expenseId, "approve")}>通过</Button>
               </div>
             </div>
           </div>
         ))}
       </div>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/expenses/[id]/" "src/app/(dashboard)/approvals/"
git commit -m "feat: implement expense detail and approval list pages"
```

---

### Task 17: 实现预算、报表和设置页面

**Files:**
- Create: `src/app/(dashboard)/budgets/page.tsx`
- Create: `src/app/(dashboard)/reports/page.tsx`
- Create: `src/app/(dashboard)/settings/users/page.tsx`
- Create: `src/app/(dashboard)/settings/departments/page.tsx`

- [ ] **Step 1: 编写预算管理页**

`src/app/(dashboard)/budgets/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ departmentId: "", year: new Date().getFullYear(), totalAmount: "" });
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/budgets").then((r) => r.json()).then(setBudgets);
    fetch("/api/departments").then((r) => r.json()).then(setDepartments);
  }, []);

  async function handleSubmit() {
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalAmount: Number(form.totalAmount) }),
    });
    setShowForm(false);
    const res = await fetch("/api/budgets");
    setBudgets(await res.json());
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">预算管理</h2>
        <Button onClick={() => setShowForm(true)}>新建预算</Button>
      </div>
      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm">部门</label>
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="w-full rounded border px-3 py-2">
                <option value="">请选择</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">年份</label>
              <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full rounded border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm">拨款金额</label>
              <input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSubmit}>保存</Button>
          </div>
        </div>
      )}
      <div className="rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">部门</th>
              <th className="px-4 py-3 text-left text-sm font-medium">年份</th>
              <th className="px-4 py-3 text-right text-sm font-medium">拨款总额</th>
              <th className="px-4 py-3 text-right text-sm font-medium">已使用</th>
              <th className="px-4 py-3 text-right text-sm font-medium">剩余</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b: any) => (
              <tr key={b.id} className="border-b">
                <td className="px-4 py-3 text-sm">{b.department.name}</td>
                <td className="px-4 py-3 text-sm">{b.year}</td>
                <td className="px-4 py-3 text-sm text-right">¥{Number(b.totalAmount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right">¥{Number(b.usedAmount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-right">¥{(Number(b.totalAmount) - Number(b.usedAmount)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写报表页**

`src/app/(dashboard)/reports/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [deptReport, setDeptReport] = useState<any[]>([]);
  const [personalSummary, setPersonalSummary] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/reports/by-department?year=${year}`).then((r) => r.json()).then(setDeptReport);
    fetch(`/api/reports/summary?year=${year}`).then((r) => r.json()).then(setPersonalSummary);
  }, [year]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">费用报表</h2>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="rounded border px-3 py-2">
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
      </div>
      <div className="rounded-lg bg-white shadow-sm mb-6 p-6">
        <h3 className="font-medium mb-4">按部门统计</h3>
        <table className="w-full">
          <thead className="border-b"><tr>
            <th className="px-4 py-2 text-left text-sm">部门</th>
            <th className="px-4 py-2 text-right text-sm">费用笔数</th>
            <th className="px-4 py-2 text-right text-sm">总金额</th>
            <th className="px-4 py-2 text-right text-sm">预算拨款</th>
            <th className="px-4 py-2 text-right text-sm">预算已用</th>
          </tr></thead>
          <tbody>
            {deptReport.map((d: any) => (
              <tr key={d.departmentId} className="border-b">
                <td className="px-4 py-2 text-sm">{d.departmentName}</td>
                <td className="px-4 py-2 text-sm text-right">{d.expenseCount}</td>
                <td className="px-4 py-2 text-sm text-right">¥{d.totalExpense.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-right">¥{d.budgetTotal.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-right">¥{d.budgetUsed.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {personalSummary && (
        <div className="rounded-lg bg-white shadow-sm p-6">
          <h3 className="font-medium mb-4">个人汇总</h3>
          <p className="text-2xl font-bold mb-4">¥{personalSummary.totalAmount.toLocaleString()}</p>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(personalSummary.byType as Record<string, number>).map(([type, amount]) => (
              <div key={type} className="rounded bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500">{type}</div>
                <div className="font-semibold text-sm">¥{amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 编写用户管理和部门管理页**

`src/app/(dashboard)/settings/users/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">用户管理</h2>
      </div>
      <div className="rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">姓名</th>
              <th className="px-4 py-3 text-left text-sm">邮箱</th>
              <th className="px-4 py-3 text-left text-sm">部门</th>
              <th className="px-4 py-3 text-left text-sm">角色</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b">
                <td className="px-4 py-3 text-sm">{u.name}</td>
                <td className="px-4 py-3 text-sm">{u.email}</td>
                <td className="px-4 py-3 text-sm">{u.department?.name}</td>
                <td className="px-4 py-3 text-sm">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

`src/app/(dashboard)/settings/departments/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/departments");
    setDepartments(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">部门管理</h2>
        <Button onClick={() => setShowForm(true)}>新建部门</Button>
      </div>
      {showForm && (
        <div className="mb-4 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded border px-3 py-2 flex-1" placeholder="部门名称" />
          <Button onClick={handleCreate}>创建</Button>
          <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
        </div>
      )}
      <div className="rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">部门名称</th>
              <th className="px-4 py-3 text-left text-sm">负责人</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d: any) => (
              <tr key={d.id} className="border-b">
                <td className="px-4 py-3 text-sm">{d.name}</td>
                <td className="px-4 py-3 text-sm">{d.head?.name || "-"}</td>
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
git add "src/app/(dashboard)/budgets/" "src/app/(dashboard)/reports/" "src/app/(dashboard)/settings/"
git commit -m "feat: implement budgets, reports, user & department management pages"
```

---

### Task 18: 实现移动端布局和页面

**Files:**
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/app/(mobile)/layout.tsx`
- Create: `src/app/(mobile)/apply/page.tsx`
- Create: `src/app/(mobile)/approval/page.tsx`
- Create: `src/app/(mobile)/profile/page.tsx`

- [ ] **Step 1: 编写移动端底部导航**

`src/components/layout/mobile-nav.tsx`:
```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/apply", label: "申请", icon: "📋" },
    { href: "/approval", label: "审批", icon: "✅" },
    { href: "/profile", label: "我的", icon: "👤" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex z-50">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 py-3 text-center text-xs ${pathname === tab.href ? "text-blue-600" : "text-gray-500"}`}
        >
          <div className="text-lg">{tab.icon}</div>
          <div className="mt-0.5">{tab.label}</div>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: 编写移动端布局**

`src/app/(mobile)/layout.tsx`:
```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="pb-16">
      <main className="p-4">{children}</main>
      <MobileNav />
    </div>
  );
}
```

- [ ] **Step 3: 编写移动端页面**

`src/app/(mobile)/apply/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function MobileApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ type: "travel", title: "", amount: "", description: "", expenseDate: new Date().toISOString().split("T")[0] });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, isDraft: false }) });
    router.push("/approval");
  }

  const types = [
    { value: "travel", label: "差旅" },
    { value: "procurement", label: "采购" },
    { value: "entertainment", label: "招待" },
    { value: "general", label: "通用" },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">新建费用申请</h2>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-gray-600">费用类型</label>
          <div className="flex gap-2">
            {types.map((t) => (
              <button key={t.value} onClick={() => setForm({ ...form, type: t.value })} className={`flex-1 rounded border py-2 text-sm ${form.type === t.value ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">标题</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" placeholder="如：北京出差" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">金额 (元)</label>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">事由说明</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm" placeholder="描述费用用途..." />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>提交申请</Button>
      </div>
    </div>
  );
}
```

`src/app/(mobile)/approval/page.tsx`:
```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function MobileApprovalPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/approvals/pending");
    setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAction(recordId: string, action: string) {
    await fetch(`/api/approvals/${recordId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    load();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">待审批 ({items.length})</h2>
      {items.length === 0 ? <p className="text-gray-500 text-center mt-8">暂无待审批</p> :
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-4">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-sm">{item.applicantName}</span>
                <span className="font-semibold text-sm text-red-600">¥{Number(item.amount).toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-600 mb-1">{item.expenseTitle}</div>
              <div className="text-xs text-gray-400 mb-3">{item.expenseType} · {item.expenseDate}</div>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" className="flex-1" onClick={() => handleAction(item.id, "reject")}>驳回</Button>
                <Button size="sm" className="flex-1" onClick={() => handleAction(item.id, "approve")}>通过</Button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
```

`src/app/(mobile)/profile/page.tsx`:
```typescript
"use client";

import { signOut, useSession } from "next-auth/react";

export default function MobileProfilePage() {
  const { data: session } = useSession();

  return (
    <div>
      <div className="text-center py-8">
        <h2 className="text-lg font-semibold">{session?.user?.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{session?.user?.email}</p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full rounded bg-gray-100 py-3 text-sm text-gray-700 mt-4"
      >
        退出登录
      </button>
    </div>
  );
}
```

- [ ] **Step 4: 添加 Departments API 和 Users API**

`src/app/api/departments/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET() {
  const list = await prisma.department.findMany({
    include: { head: { select: { id: true, name: true } } },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user.role !== "admin") return NextResponse.json({ error: { code: "FORBIDDEN", message: "无权操作" } }, { status: 403 });
  const { name } = await req.json();
  const dept = await prisma.department.create({ data: { name } });
  return NextResponse.json(dept, { status: 201 });
}
```

`src/app/api/users/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, department: { select: { name: true } } },
  });
  return NextResponse.json(users);
}
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(mobile)/" src/components/layout/mobile-nav.tsx src/app/api/departments/ src/app/api/users/
git commit -m "feat: implement mobile layout with bottom nav and core mobile pages"
```

---

## 第六阶段：种子数据和 E2E 测试

### Task 19: 编写数据库种子脚本

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: 编写 seed 脚本**

`prisma/seed.ts`:
```typescript
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123456", 12);

  // 创建部门
  const deptTech = await prisma.department.create({ data: { name: "技术部" } });
  const deptMarket = await prisma.department.create({ data: { name: "市场部" } });
  const deptFinance = await prisma.department.create({ data: { name: "财务部" } });

  // admin
  const admin = await prisma.user.create({
    data: { name: "管理员", email: "admin@company.com", passwordHash: hash, departmentId: deptTech.id, role: "admin" },
  });

  // 部门负责人
  const techHead = await prisma.user.create({
    data: { name: "张总", email: "zhang@company.com", passwordHash: hash, departmentId: deptTech.id, role: "dept_head" },
  });
  const marketHead = await prisma.user.create({
    data: { name: "李总", email: "li@company.com", passwordHash: hash, departmentId: deptMarket.id, role: "dept_head" },
  });

  // 更新部门负责人
  await prisma.department.update({ where: { id: deptTech.id }, data: { headId: techHead.id } });
  await prisma.department.update({ where: { id: deptMarket.id }, data: { headId: marketHead.id } });

  // 主管
  const techManager = await prisma.user.create({
    data: { name: "王主管", email: "wang@company.com", passwordHash: hash, departmentId: deptTech.id, role: "manager", managerId: techHead.id },
  });

  // 财务
  const finance = await prisma.user.create({
    data: { name: "赵财务", email: "zhao@company.com", passwordHash: hash, departmentId: deptFinance.id, role: "finance" },
  });

  // 普通员工
  await prisma.user.create({
    data: { name: "小明", email: "xiaoming@company.com", passwordHash: hash, departmentId: deptTech.id, role: "employee", managerId: techManager.id },
  });

  await prisma.user.create({
    data: { name: "小红", email: "xiaohong@company.com", passwordHash: hash, departmentId: deptMarket.id, role: "employee", managerId: marketHead.id },
  });

  // 预算
  await prisma.budget.create({ data: { departmentId: deptTech.id, year: 2026, totalAmount: 100000, usedAmount: 0 } });
  await prisma.budget.create({ data: { departmentId: deptMarket.id, year: 2026, totalAmount: 50000, usedAmount: 0 } });

  console.log("Seed data created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: 配置 package.json seed 脚本**

在 `package.json` 中添加：
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

安装 tsx: `npm install -D tsx`

- [ ] **Step 3: 运行 seed**

```bash
npx prisma db seed
```

Expected: 创建 2 个部门, 7 个用户, 2 条预算记录.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add database seed script with demo users and budgets"
```

---

### Task 20: 编写 Playwright E2E 测试

**Files:**
- Create: `e2e/expense-flow.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: 编写 Playwright 配置**

`playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 2: 编写 E2E 测试**

`e2e/expense-flow.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test.describe("费用申请审批流程", () => {
  test("登录 → 提交申请 → 审批通过 → 放款", async ({ page }) => {
    // 登录
    await page.goto("/login");
    await page.fill("input[type=email]", "xiaoming@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL(/\/expenses/);

    // 新建申请
    await page.goto("/expenses/new");
    await page.fill("input[type=text]", "E2E 测试差旅费");
    await page.fill("input[type=number]", "5000");
    await page.fill("textarea", "E2E 测试费用描述");
    await page.click("text=提交申请");
    await expect(page).toHaveURL(/\/expenses/);

    // 主管登录审批
    await page.goto("/login");
    await page.fill("input[type=email]", "wang@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");
    await page.goto("/approvals");
    await page.click("text=通过");

    // 部门负责人登录审批
    await page.goto("/login");
    await page.fill("input[type=email]", "zhang@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");
    await page.goto("/approvals");
    await page.click("text=通过");

    // 财务登录审批 + 放款
    await page.goto("/login");
    await page.fill("input[type=email]", "zhao@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");
    await page.goto("/approvals");
    await page.click("text=通过");
  });

  test("登录 → 提交 → 主管驳回", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type=email]", "xiaoming@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");

    await page.goto("/expenses/new");
    await page.fill("input[type=text]", "测试驳回场景");
    await page.fill("input[type=number]", "3000");
    await page.fill("textarea", "测试驳回");
    await page.click("text=提交申请");

    await page.goto("/login");
    await page.fill("input[type=email]", "wang@company.com");
    await page.fill("input[type=password]", "123456");
    await page.click("button[type=submit]");
    await page.goto("/approvals");
    await page.click("text=驳回");
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add e2e/ playwright.config.ts
git commit -m "test: add Playwright E2E tests for expense approval flow"
```

---

### Task 21: 添加 NextAuth SessionProvider 和环境文件模板

**Files:**
- Create: `src/app/providers.tsx`
- Modify: `src/app/layout.tsx`
- Create: `.env.example`

- [ ] **Step 1: 创建 SessionProvider**

`src/app/providers.tsx`:
```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 2: 更新根 layout.tsx 包裹 Provider**

修改 `src/app/layout.tsx`，在 body 中包裹 `<Providers>`:
```typescript
import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "费用管理系统",
  description: "公司内部费用管理平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 创建环境变量模板**

`.env.example`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_management?schema=public"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_DIR="uploads"
```

- [ ] **Step 4: 添加 Prisma generate 到 postinstall**

在 `package.json` 的 scripts 中确认包含:
```json
"postinstall": "prisma generate"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/providers.tsx src/app/layout.tsx .env.example package.json
git commit -m "chore: add SessionProvider, env template, and postinstall script"
```

---

## 验证清单

- [ ] `npx prisma migrate dev` 成功创建所有表
- [ ] `npx prisma db seed` 成功填充种子数据
- [ ] `npm run dev` 启动无报错
- [ ] 访问 /login 可登录（admin@company.com / 123456）
- [ ] 访问 /expenses/new 可提交申请
- [ ] 主管登录可在 /approvals 审批
- [ ] 财务登录可放款
- [ ] 移动端 /apply 可提交申请
- [ ] `npx playwright test` E2E 测试通过
