"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  departmentId: "",
  role: "employee" as string,
  managerId: "",
};

export default function UsersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<"users" | "clean">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const loadData = useCallback(async () => {
    const [usersRes, deptRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/departments"),
    ]);
    const usersData = await usersRes.json();
    setUsers(usersData);
    setDepartments(await deptRes.json());
    setManagers(usersData.filter((u: any) => ["manager", "dept_head"].includes(u.role)));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError("");
  }

  function openEdit(u: any) {
    setEditId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      departmentId: u.department?.id || "",
      role: u.role,
      managerId: u.managerId || "",
    });
    setShowForm(true);
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/users/${editId}` : "/api/auth/register";
    const body: any = { ...form, managerId: form.managerId || null };
    if (editId && !body.password) delete body.password;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("users.operationFailed"));
      setSubmitting(false);
      return;
    }

    closeForm();
    setSubmitting(false);
    loadData();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || t("users.deleteFailed"));
      return;
    }
    setDeleteConfirm(null);
    loadData();
  }

  async function handleCleanExpenses() {
    if (!confirm("PERMANENTLY DELETE all expenses, approvals, attachments and notifications? Users and departments will be kept.\n\nThis cannot be undone.")) return;
    setCleaning(true);
    const res = await fetch("/api/expenses", { method: "DELETE" });
    if (!res.ok) { toast("Delete failed", "error"); setCleaning(false); return; }
    const d = await res.json();
    toast(`Deleted ${d.deleted} expenses`);
    setCleaning(false);
  }

  // Search & selective delete state
  const [cStartDate, setCStartDate] = useState("");
  const [cEndDate, setCEndDate] = useState("");
  const [cSearch, setCSearch] = useState("");
  const [cResults, setCResults] = useState<any[]>([]);
  const [cSelected, setCSelected] = useState<Set<string>>(new Set());
  const [cSearching, setCSearching] = useState(false);
  const [cDeleting, setCDeleting] = useState(false);

  async function handleSearch() {
    setCSearching(true);
    const p = new URLSearchParams({ page: "1", pageSize: "200", status: "all" });
    if (cStartDate) p.set("startDate", cStartDate);
    if (cEndDate) p.set("endDate", cEndDate);
    if (cSearch) p.set("search", cSearch);
    const res = await fetch(`/api/expenses?${p}`);
    const d = await res.json();
    setCResults(d.items || []);
    setCSelected(new Set());
    setCSearching(false);
  }

  function toggleSelect(id: string) {
    setCSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (cSelected.size === cResults.length) {
      setCSelected(new Set());
    } else {
      setCSelected(new Set(cResults.map((r: any) => r.id)));
    }
  }

  async function deleteSelected() {
    if (cSelected.size === 0) { toast("No items selected", "error"); return; }
    if (!confirm(`Delete ${cSelected.size} selected expenses and their approval records?`)) return;
    setCDeleting(true);
    let count = 0;
    for (const id of Array.from(cSelected)) {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) count++;
    }
    toast(`Deleted ${count} expenses`);
    setCDeleting(false);
    handleSearch();
  }

  const isEditing = editId !== null;
  const roleOptions = ["admin", "finance", "dept_head", "manager", "employee"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-0 border-b border-slate-200">
          <button onClick={() => setTab("users")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>{t("users.title")}</button>
          <button onClick={() => setTab("clean")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "clean" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>Clean Data</button>
        </div>
        {tab === "users" && (
          <button
            onClick={showForm ? closeForm : openCreate}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {showForm ? t("users.cancel") : t("users.addUser")}
          </button>
        )}
      </div>

      {tab === "clean" ? (
        <div className="space-y-4">
          {/* Delete All */}
          <div className="rounded-lg border-2 border-red-200 bg-red-50/50 p-5">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Delete All Expenses</h3>
            <p className="text-xs text-red-500 mb-3">Delete ALL expenses, approvals, attachments, and notifications at once.</p>
            <button onClick={handleCleanExpenses} disabled={cleaning}
              className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 transition-colors">
              {cleaning ? "Deleting..." : "Delete All"}
            </button>
          </div>

          {/* Search & Selective Delete */}
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search & Selective Delete</h3>
            <div className="flex flex-wrap items-end gap-2 mb-4">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
                <input type="date" value={cStartDate} onChange={(e) => setCStartDate(e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
                <input type="date" value={cEndDate} onChange={(e) => setCEndDate(e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Search</label>
                <input type="text" value={cSearch} onChange={(e) => setCSearch(e.target.value)}
                  placeholder="Title / Applicant..."
                  className="w-44 rounded border border-slate-200 px-2 py-1.5 text-sm" />
              </div>
              <button onClick={handleSearch} disabled={cSearching}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
                {cSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {cResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={cSelected.size === cResults.length && cResults.length > 0} onChange={toggleAll} />
                    Select All ({cResults.length} results)
                  </label>
                  <div className="flex-1" />
                  <button onClick={deleteSelected} disabled={cDeleting || cSelected.size === 0}
                    className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
                    {cDeleting ? "Deleting..." : `Delete Selected (${cSelected.size})`}
                  </button>
                </div>
                <div className="max-h-80 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 w-8"></th>
                        <th className="px-3 py-1.5 text-left">Date</th>
                        <th className="px-3 py-1.5 text-left">Title</th>
                        <th className="px-3 py-1.5 text-left">Applicant</th>
                        <th className="px-3 py-1.5 text-right">Amount</th>
                        <th className="px-3 py-1.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cResults.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-1.5">
                            <input type="checkbox" checked={cSelected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{item.expenseDate}</td>
                          <td className="px-3 py-1.5 font-medium">{item.title}</td>
                          <td className="px-3 py-1.5 text-gray-500">{item.applicantName}</td>
                          <td className="px-3 py-1.5 text-right">M{Number(item.amount).toLocaleString()}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              item.status === "approved" || item.status === "paid" ? "bg-green-100 text-green-700" :
                              item.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-medium text-gray-700">
                {isEditing ? t("users.editUser") : t("users.newUser")}
              </h3>
              {error && (
                <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">{t("users.name")}</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">{t("users.email")}</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    {t("users.password")} {isEditing && <span className="text-gray-400">{t("users.passwordHint")}</span>}
                  </label>
                  <input required={!isEditing} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">{t("users.department")}</label>
                  <select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">{t("users.selectDepartment")}</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">{t("users.role")}</label>
                  <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    {roleOptions.map((value) => <option key={value} value={value}>{t(`roles.${value}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    {t("users.manager")} <span className="text-gray-400">{t("users.managerHint")}</span>
                  </label>
                  <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">-</option>
                    {managers.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({t(`roles.${m.role}`)})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="submit" disabled={submitting}
                  className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? t("users.saving") : isEditing ? t("users.saveChanges") : t("users.createUser")}
                </button>
                <button type="button" onClick={closeForm}
                  className="rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  {t("users.cancel")}
                </button>
              </div>
            </form>
          )}

          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
                <h3 className="text-lg font-medium mb-2">{t("users.confirmDeleteTitle")}</h3>
                <p className="text-sm text-gray-600 mb-4">{t("users.confirmDelete")}</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteConfirm(null)} className="rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{t("users.cancel")}</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">{t("users.confirmDeleteBtn")}</button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">{t("users.name2")}</th>
                  <th className="px-4 py-3 text-left text-sm">{t("users.email2")}</th>
                  <th className="px-4 py-3 text-left text-sm">{t("users.department2")}</th>
                  <th className="px-4 py-3 text-left text-sm">{t("users.role2")}</th>
                  <th className="px-4 py-3 text-right text-sm">{t("users.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b">
                    <td className="px-4 py-3 text-sm">{u.name}</td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.department?.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{t(`roles.${u.role}`)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button onClick={() => openEdit(u)} className="mr-2 text-blue-600 hover:text-blue-800">{t("users.edit")}</button>
                      <button onClick={() => { setDeleteConfirm(u.id); setError(""); }} className="text-red-600 hover:text-red-800">{t("users.delete")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
