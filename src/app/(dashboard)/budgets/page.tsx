"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export default function BudgetsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const canEdit = (session?.user as any)?.role === "admin" || (session?.user as any)?.role === "dept_head";
  const [departments, setDepartments] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [editExact, setEditExact] = useState(false);
  const [deptExpense, setDeptExpense] = useState(0);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    fetch("/api/departments").then(r => r.json()).then(setDepartments);
  }, []);

  useEffect(() => {
    fetch(`/api/reports/company?year=${year}`).then((r) => r.json()).then(setCompany);
  }, [year]);

  async function loadBudgets() {
    const [budgetRes, reportRes] = await Promise.all([
      fetch(`/api/budgets?year=${year}&departmentId=${departmentId}`),
      fetch(`/api/reports/by-department?year=${year}`),
    ]);
    const budgetData = await budgetRes.json();
    setBudgets(budgetData);

    const depts = await reportRes.json();
    const dept = depts.find((d: any) => d.departmentId === departmentId);
    setDeptExpense(dept?.totalExpense || 0);
  }

  useEffect(() => {
    if (departmentId) loadBudgets();
  }, [year, departmentId]);

  async function handleSubmit() {
    setError("");
    if (!amount || Number(amount) <= 0) {
      setError(t("budgets.invalidAmount"));
      return;
    }
    const url = editExact ? "/api/budgets?action=set" : "/api/budgets";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, departmentId, totalAmount: Number(amount) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || t("budgets.saveFailed"));
      return;
    }
    setShowForm(false);
    setAmount("");
    loadBudgets();
  }

  const currentBudget = budgets[0];
  const budgetAmount = currentBudget ? Number(currentBudget.totalAmount) : 0;
  const remaining = budgetAmount - deptExpense;
  const deptName = departments.find((d: any) => d.id === departmentId)?.name || "";

  if (!departmentId && departments.length > 0) {
    setDepartmentId(departments[0].id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t("budgets.title")}</h2>
        <div className="flex items-center gap-3">
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded border px-3 py-2 text-sm">
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="rounded border px-3 py-2 text-sm">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {canEdit && <Button onClick={() => { setShowForm(true); setError(""); }}>{t("budgets.setBudget")}</Button>}
        </div>
      </div>

      {company && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.companyTotalBudget")}</p>
            <p className="text-2xl font-bold text-blue-600">M{company.totalBudget.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-orange-500">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.spent")}</p>
            <p className="text-2xl font-bold text-orange-600">M{company.totalExpense.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-purple-500">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.budgetUsed")}</p>
            <p className="text-2xl font-bold text-purple-600">M{company.totalUsed.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-500">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.remaining")}</p>
            <p className={`text-2xl font-bold ${company.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
              M{company.remaining.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {currentBudget ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.yearBudget").replace("{year}", String(year)).replace("{dept}", deptName)}</p>
            <p className="text-2xl font-bold text-blue-600">M{budgetAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.actualExpense")}</p>
            <p className="text-2xl font-bold text-orange-600">M{deptExpense.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{t("budgets.remaining")}</p>
            <p className={`text-2xl font-bold ${remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
              M{remaining.toLocaleString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 mb-6 shadow-sm">
          {t("budgets.noBudgetData").replace("{year}", String(year)).replace("{dept}", deptName)}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-medium text-gray-700">
            {currentBudget
              ? t("budgets.adjustBudget").replace("{year}", String(year)).replace("{dept}", deptName)
              : t("budgets.createBudget").replace("{year}", String(year)).replace("{dept}", deptName)}
          </h3>
          {currentBudget && (
            <p className="text-sm text-gray-500 mb-4">
              {t("budgets.currentBudget")}M{budgetAmount.toLocaleString()}，
              {t("budgets.currentExpense")}M{deptExpense.toLocaleString()}
            </p>
          )}
          {error && <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">{t("budgets.allocationAmount")}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-64 rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder={editExact ? "Enter exact amount" : t("budgets.placeholder")} />
              {currentBudget && (
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                  <input type="checkbox" checked={editExact} onChange={(e) => { setEditExact(e.target.checked); setAmount(""); }} />
                  Set exact
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit}>{t("budgets.save")}</Button>
              <Button variant="secondary" onClick={() => { setShowForm(false); setError(""); }}>{t("budgets.cancel")}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">{t("budgets.year")}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">{t("budgets.department")}</th>
              <th className="px-4 py-3 text-right text-sm font-medium">{t("budgets.totalAllocation")}</th>
              <th className="px-4 py-3 text-right text-sm font-medium">{t("budgets.used")}</th>
              <th className="px-4 py-3 text-right text-sm font-medium">{t("budgets.remaining2")}</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">{t("budgets.noBudgetDataShort")}</td>
              </tr>
            ) : (
              budgets.map((b: any) => {
                const used = Number(b.actualExpense);
                const rem = Number(b.totalAmount) - used;
                return (
                  <tr key={b.id} className="border-b">
                    <td className="px-4 py-3 text-sm">{b.year}</td>
                    <td className="px-4 py-3 text-sm">{b.department?.name}</td>
                    <td className="px-4 py-3 text-sm text-right">M{Number(b.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">M{used.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${rem >= 0 ? "text-green-600" : "text-red-600"}`}>
                      M{rem.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
