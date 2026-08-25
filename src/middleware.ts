import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  const protectedPaths = ["/expenses", "/approvals", "/budgets", "/reports", "/settings", "/notifications", "/materials", "/inspections"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const authApiPaths = ["/api/expenses", "/api/approvals", "/api/budgets", "/api/reports", "/api/upload", "/api/materials", "/api/inspections"];
  const isAuthApi = authApiPaths.some((p) => pathname.startsWith(p));

  if (isAuthApi && !isLoggedIn) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Access denied" } }, { status: 401 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};
