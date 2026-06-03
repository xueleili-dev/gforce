"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/i18n";

export default function DepartmentsPage() {
  const { t } = useI18n();
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [headId, setHeadId] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [deptRes, usersRes] = await Promise.all([
      fetch("/api/departments"),
      fetch("/api/users"),
    ]);
    setDepartments(await deptRes.json());
    setUsers(await usersRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const headCandidates = users.filter((u: any) =>
    ["manager", "dept_head", "admin"].includes(u.role)
  );

  function openCreate() {
    setEditId(null);
    setName("");
    setHeadId("");
    setError("");
    setShowForm(true);
  }

  function openEdit(d: any) {
    setEditId(d.id);
    setName(d.name);
    setHeadId(d.head?.id || "");
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;

    const method = editId ? "PATCH" : "POST";
    const url = editId ? `/api/departments/${editId}` : "/api/departments";
    const body: any = { name: name.trim() };
    if (headId !== undefined) body.headId = headId || null;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("departments.operationFailed"));
      return;
    }

    setName("");
    setHeadId("");
    setEditId(null);
    setShowForm(false);
    loadData();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || t("departments.deleteFailed"));
      setDeleteConfirm(null);
      return;
    }
    setDeleteConfirm(null);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t("departments.title")}</h2>
        <button onClick={openCreate} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          {t("departments.newDepartment")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-medium text-gray-700">
            {editId ? t("departments.editDepartment") : t("departments.newDepartment2")}
          </h3>
          {error && (
            <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">{t("departments.name")}</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder={t("departments.namePlaceholder")} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                {t("departments.head")} <span className="text-gray-400">{t("departments.headHint")}</span>
              </label>
              <select value={headId} onChange={(e) => setHeadId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">{t("departments.noHead")}</option>
                {headCandidates.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.department?.name || "-"} · {u.role})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              {editId ? t("departments.saveChanges") : t("departments.create")}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setError(""); }}
              className="rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              {t("departments.cancel")}
            </button>
          </div>
        </form>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium mb-2">{t("departments.confirmDeleteTitle")}</h3>
            <p className="text-sm text-gray-600 mb-4">{t("departments.confirmDelete")}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{t("departments.cancel")}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">{t("departments.confirmDeleteBtn")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm">{t("departments.name2")}</th>
              <th className="px-4 py-3 text-left text-sm">{t("departments.head2")}</th>
              <th className="px-4 py-3 text-right text-sm">{t("departments.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d: any) => (
              <tr key={d.id} className="border-b">
                <td className="px-4 py-3 text-sm">{d.name}</td>
                <td className="px-4 py-3 text-sm">
                  {d.head ? (
                    <span className="text-blue-600">{d.head.name}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button onClick={() => openEdit(d)} className="mr-2 text-blue-600 hover:text-blue-800">{t("departments.edit")}</button>
                  <button onClick={() => { setDeleteConfirm(d.id); setError(""); }} className="text-red-600 hover:text-red-800">{t("departments.delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
