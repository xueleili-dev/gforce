"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!currentPassword) { setError("Current password is required"); return; }
    if (!newPassword || newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    setSubmitting(true);
    const res = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to change password");
      setSubmitting(false);
      return;
    }

    toast("Password changed successfully");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSubmitting(false);
  }

  const user = session?.user as any;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-6">{t("sidebar.settings")}</h2>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200/60 p-6 mb-6">
        <h3 className="font-medium mb-4">Account Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200/60 p-6">
        <h3 className="font-medium mb-4">Change Password</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className="mb-1 block text-sm text-gray-600">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {submitting ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
