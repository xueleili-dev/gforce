"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n";

export default function InspectionsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { data: session } = useSession();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const role = (session?.user as any)?.role;
  const isEngineer = (session?.user as any)?.isEngineer;
  const userId = (session?.user as any)?.id;
  const canManage = role === "admin" || role === "dept_head" || role === "manager";
  const canManageChecklist = role === "admin" || role === "dept_head";
  const canCreate = role === "admin" || role === "dept_head" || isEngineer === true;

  useEffect(() => {
    fetch("/api/inspections")
      .then((r) => r.json())
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, siteName: string) {
    if (!confirm(`Delete inspection report "${siteName}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/inspections/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDownload(id: string, siteName: string) {
    const res = await fetch(`/api/inspections/${id}/pdf`);
    if (!res.ok) {
      alert("Download failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${siteName}-report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Site Inspections</h2>
        <div className="flex gap-2">
          {canManageChecklist && (
            <button onClick={() => router.push("/inspections/checklist")}
              className="rounded border border-slate-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Manage Checklist
            </button>
          )}
          {canCreate && (
            <button onClick={() => router.push("/inspections/new")}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              New Inspection
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500">No inspection reports yet</p>
      ) : (
        <div className="rounded-lg bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Site Name</th>
                <th className="px-3 py-2 text-left">Region</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Staff</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Items</th>
                <th className="px-3 py-2 text-center">Photos</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/inspections/${r.id}`)}>
                  <td className="px-3 py-2 font-medium">{r.siteName}</td>
                  <td className="px-3 py-2 text-gray-500">{r.region}</td>
                  <td className="px-3 py-2 text-gray-500">{r.typeOfStructure}</td>
                  <td className="px-3 py-2 text-gray-500">{new Date(r.inspectionDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-gray-500">{r.staffName}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "submitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">{r._count?.results || 0}</td>
                  <td className="px-3 py-2 text-center text-gray-500">{r._count?.images || 0}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {(canManage || r.staffId === userId) && (
                      <button onClick={() => handleDownload(r.id, r.siteName)}
                        className="mr-2 text-green-600 hover:text-green-800">Download</button>
                    )}
                    <button onClick={() => router.push(`/inspections/${r.id}`)}
                      className="mr-2 text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDelete(r.id, r.siteName)}
                      className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
