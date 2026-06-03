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
