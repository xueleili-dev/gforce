import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { approvalService } from "@/services/approval.service";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const approverRoles = ["manager", "dept_head", "finance"];
  let pendingCount: number | undefined;
  if (approverRoles.includes(user.role)) {
    pendingCount = await approvalService.countPending(user.id);
  }

  return (
    <ToastProvider>
      <DashboardShell
        userRole={user.role || "employee"}
        userName={user.name}
        userEmail={user.email}
        isEngineer={user.isEngineer || false}
        pendingCount={pendingCount}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
