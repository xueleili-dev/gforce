import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("123456", 12);

  // Clean existing data in reverse dependency order
  await prisma.budget.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const deptTech = await prisma.department.create({ data: { name: "Engineering" } });
  const deptFinance = await prisma.department.create({ data: { name: "Finance" } });

  const admin = await prisma.user.create({
    data: { name: "Admin", email: "admin@company.com", passwordHash: hash, departmentId: deptTech.id, role: "admin" },
  });

  const techHead = await prisma.user.create({
    data: { name: "Lee", email: "lee@company.com", passwordHash: hash, departmentId: deptTech.id, role: "dept_head" },
  });

  await prisma.department.update({ where: { id: deptTech.id }, data: { headId: techHead.id } });

  const techManager = await prisma.user.create({
    data: { name: "Wang", email: "wang@company.com", passwordHash: hash, departmentId: deptTech.id, role: "manager", managerId: techHead.id },
  });

  await prisma.user.create({
    data: { name: "Xiaoming", email: "xiaoming@company.com", passwordHash: hash, departmentId: deptTech.id, role: "employee", managerId: techManager.id },
  });

  // Test users referenced by the e2e suite (e2e/*.spec.ts)
  const lichaba = await prisma.user.create({
    data: { name: "Lichaba", email: "lichaba@company.com", passwordHash: hash, departmentId: deptTech.id, role: "manager", managerId: techHead.id },
  });

  await prisma.user.create({
    data: { name: "User", email: "user@company.com", passwordHash: hash, departmentId: deptTech.id, role: "employee", managerId: lichaba.id },
  });

  await prisma.user.create({
    data: { name: "Morongoe", email: "morongoe@company.com", passwordHash: hash, departmentId: deptFinance.id, role: "finance" },
  });

  await prisma.budget.create({ data: { year: 2026, departmentId: deptTech.id, totalAmount: 200000, usedAmount: 0 } });

  console.log("Seed data created!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
