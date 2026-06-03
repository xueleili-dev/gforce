"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./sidebar";
import { UserHeader } from "./user-header";

export function DashboardShell({
  userRole,
  userName,
  userEmail,
  pendingCount: initialPendingCount,
  children,
}: {
  userRole: string;
  userName: string;
  userEmail: string;
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const refreshPending = useCallback(() => {
    fetch("/api/approvals/pending/count")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Listen for approval actions from other components
    window.addEventListener("pending-count-updated", refreshPending);
    // Poll every 30s as fallback
    const interval = setInterval(refreshPending, 30000);
    return () => {
      window.removeEventListener("pending-count-updated", refreshPending);
      clearInterval(interval);
    };
  }, [refreshPending]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userRole={userRole}
        pendingCount={pendingCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <UserHeader
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
