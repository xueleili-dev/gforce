# 公司内部费用管理系统 — 设计文档

> 2026-05-22 · 版本 v1

---

## 1. 项目概述

面向小型公司（<50 人）的内部费用管理系统，涵盖部门预算拨款、费用申请提交、多级审批流程和财务放款。

### 核心功能

- **预算管理** — 财务给各部门分配年度预算额度
- **费用申请** — 员工提交差旅/采购/招待/通用费用申请，支持附件上传
- **多级审批** — 主管 → 部门负责人 → 财务复核，超过 1 万元自动加签
- **财务放款** — 财务确认后标记放款，更新预算已用额度
- **报表统计** — 个人/部门/公司费用报表

### 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js (App Router) |
| 语言 | TypeScript |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 鉴权 | NextAuth.js (JWT, Credentials Provider) |
| UI | Tailwind CSS |
| 测试 | Vitest + Playwright |

### 客户端

- **PC Web** — 完整功能，侧边栏导航
- **移动端 Web** — 响应式，聚焦提交申请和快速审批

---

## 2. 系统架构

```
客户端层
  ├── PC Web（完整功能）
  └── 移动端 Web（响应式，核心操作）

API 层（Next.js API Routes）
  ├── /api/auth/*       — 登录/注册/session
  ├── /api/expenses/*   — 费用 CRUD
  ├── /api/approvals/*  — 审批操作
  ├── /api/budgets/*    — 预算管理
  ├── /api/reports/*    — 报表查询
  └── /api/upload       — 文件上传

服务层（Services）
  ├── AuthService       — 用户鉴权、角色权限
  ├── ExpenseService    — 费用 CRUD、状态机流转
  ├── ApprovalService   — 审批链构建、加签逻辑
  ├── BudgetService     — 拨款、余额查询
  └── ReportService     — 聚合统计

数据层
  └── PostgreSQL + Prisma ORM
```

---

## 3. 数据模型

### 表结构

**User** — 用户表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| name | String | 姓名 |
| email | String (unique) | 登录邮箱 |
| password_hash | String | |
| department_id | UUID (FK) | 所属部门 |
| role | Enum | employee / manager / dept_head / finance / admin |
| manager_id | UUID (FK → self) | 直属主管 |

**Department** — 部门表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| name | String | 部门名称 |
| head_id | UUID (FK → User) | 部门负责人 |

**Budget** — 预算表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| department_id | UUID (FK) | |
| year | Int | 预算年度 |
| total_amount | Decimal | 拨款总额 |
| used_amount | Decimal | 已使用金额 |

**Expense** — 费用申请表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| applicant_id | UUID (FK → User) | 申请人 |
| department_id | UUID (FK) | |
| type | Enum | travel / procurement / entertainment / general |
| title | String | 申请标题 |
| description | Text | 事由说明 |
| amount | Decimal | 申请金额 |
| status | Enum | 状态机（见下方） |
| current_approver_id | UUID (FK → User) | 当前处理人 |

**ApprovalRecord** — 审批记录表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| expense_id | UUID (FK) | |
| approver_id | UUID (FK → User) | |
| level | Enum | level1 / level2 / finance / countersign |
| action | Enum | approved / rejected / returned |
| comment | Text? | 审批意见 |
| acted_at | DateTime? | 操作时间 |

**Attachment** — 附件表
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID (PK) | |
| expense_id | UUID (FK) | |
| filename | String | |
| url | String | |
| size | Int | 字节 |
| mime_type | String | |

### 关系

```
Department 1──N User
Department 1──N Budget
User 1──N Expense (applicant)
Department 1──N Expense
Expense 1──N ApprovalRecord
Expense 1──N Attachment
User (self-ref) manager_id → User.id
```

### 费用状态机

```
draft → submitted → level1_approval → level2_approval → finance_review → approved → paid
                       ↓                  ↓                  ↓
                    rejected           rejected           rejected
                       ↓                  ↓                  ↓
                    (退回修改，状态回到 submitted)
```

- ≤ 10,000 元：3 步审批（level1 → level2 → finance）
- > 10,000 元：在 level2 和 finance 之间插入 countersign 步骤

---

## 4. 页面设计

### PC 端（侧边栏布局）

| 页面 | 路由 | 角色 |
|---|---|---|
| 我的申请 | /expenses | 所有 |
| 新建申请 | /expenses/new | 所有 |
| 待我审批 | /approvals | 主管/负责人/财务 |
| 费用报表 | /reports | 所有（个人）/ 主管+（部门）/ 财务+（全公司） |
| 预算管理 | /budgets | 财务/admin |
| 用户管理 | /settings/users | admin |
| 部门管理 | /settings/departments | admin |

### 移动端（底部 Tab 导航）

| Tab | 功能 |
|---|---|
| 申请 | 新建申请 + 我的申请列表 |
| 审批 | 待审批列表，卡片式快速通过/驳回 |
| 消息 | 审批结果通知 |
| 我的 | 个人信息、退出登录 |

### 关键页面

- **新建申请** — 费用类型选择、标题、金额、日期、事由、附件上传，支持存草稿
- **审批详情** — 申请信息、审批进度时间线、审批意见输入、通过/驳回操作
- **申请列表** — Tab 筛选（全部/审批中/已通过/已驳回），状态标签
- **移动审批卡片** — 简洁信息 + 快捷通过/驳回按钮

---

## 5. API 设计

### 认证
- `POST /api/auth/login` — 登录，返回 JWT
- `POST /api/auth/register` — 注册（admin 操作）
- `GET /api/auth/session` — 获取当前用户信息

### 费用
- `GET /api/expenses` — 列表（按角色过滤：自己的/部门的）
- `POST /api/expenses` — 创建申请
- `GET /api/expenses/[id]` — 详情
- `PUT /api/expenses/[id]` — 修改（仅 draft/rejected 状态）
- `DELETE /api/expenses/[id]` — 删除（仅 draft 状态）

### 审批
- `GET /api/approvals/pending` — 当前用户的待审批列表
- `POST /api/approvals/[id]/approve` — 通过
- `POST /api/approvals/[id]/reject` — 驳回
- `POST /api/approvals/[id]/return` — 退回修改

### 预算
- `GET /api/budgets` — 预算列表（按部门/年份）
- `POST /api/budgets` — 创建/调整预算（财务/admin）

### 报表
- `GET /api/reports/summary` — 汇总统计
- `GET /api/reports/by-department` — 按部门统计

---

## 6. 鉴权与权限

- **NextAuth.js** Credentials Provider，JWT 策略
- `middleware.ts` 保护所有 `/expenses`、`/approvals`、`/budgets`、`/settings` 路由
- API 层校验 role，审批操作校验 current_approver_id
- 权限矩阵：

| 操作 | employee | manager | dept_head | finance | admin |
|---|---|---|---|---|---|
| 提交申请 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 查看自己的申请 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 审批（作为当前审批人） | | ✓ | ✓ | ✓ | |
| 查看部门报表 | | ✓ | ✓ | ✓ | ✓ |
| 管理预算 | | | | ✓ | ✓ |
| 管理系统用户 | | | | | ✓ |

---

## 7. 错误处理

统一 JSON 响应格式：
```json
{ "error": { "code": "FORBIDDEN", "message": "无权操作" } }
```

- 400 — Zod 参数校验失败
- 401 — 未登录
- 403 — 无权限
- 404 — 资源不存在
- 409 — 状态冲突（如重复审批）
- 500 — 服务端异常

---

## 8. 文件上传

- 前端 FormData multipart 上传
- 存储至 `/uploads` 目录（生产环境可用 S3/OSS）
- 限制：单文件 ≤ 10MB，类型 jpg/png/pdf
- 接口：`POST /api/upload` → 返回文件 URL

---

## 9. 测试策略

| 层级 | 工具 | 覆盖 |
|---|---|---|
| 单元测试 | Vitest | Service 层业务逻辑 |
| API 测试 | Vitest | 关键端点（提交/审批/驳回） |
| E2E | Playwright | 核心流程：登录→提交→审批→放款 |

重点测试项：审批链状态机、权限校验、金额阈值加签、边界值。

---

## 10. 项目目录结构

```
src/
├── app/
│   ├── (dashboard)/    ← PC 端布局
│   │   ├── expenses/
│   │   ├── approvals/
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── settings/
│   ├── (mobile)/       ← 移动端布局
│   │   ├── apply/
│   │   ├── approval/
│   │   └── profile/
│   ├── api/
│   │   ├── auth/
│   │   ├── expenses/
│   │   ├── approvals/
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── upload/
│   ├── login/
│   └── layout.tsx
├── components/         ← 共享 UI 组件
├── services/           ← 业务逻辑层
├── lib/                ← 工具函数 / prisma / auth
└── middleware.ts        ← 鉴权中间件
```

---

## 11. 未纳入范围（YAGNI）

- 预算硬性校验（只记录不阻止）
- 发票 OCR 识别
- 多币种支持
- 对接银行/第三方支付
- 审批代理/转交机制
- 钉钉/企业微信集成（预留扩展点但不实现）
