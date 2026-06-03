import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const expenseSchema = z.object({
  type: z.enum(["travel", "procurement", "entertainment", "general"]),
  title: z.string().min(1, "Title is required").max(100),
  project: z.string().optional().default(""),
  description: z.string().min(1, "Description is required").max(2000),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const approvalCommentSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  departmentId: z.string().min(1, "Please select a department"),
  role: z.enum(["admin", "finance", "dept_head", "manager", "employee"]),
  managerId: z.string().optional().nullable(),
});

export const budgetSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  departmentId: z.string().uuid(),
  totalAmount: z.coerce.number().positive("Amount must be greater than 0"),
});
