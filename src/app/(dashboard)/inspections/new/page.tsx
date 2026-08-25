"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n";

export default function NewInspectionPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { data: session } = useSession();
  const [form, setForm] = useState({
    siteName: "",
    region: "",
    typeOfStructure: "",
    heightOfTower: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    staffName: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const name = session?.user?.name;
    if (name) {
      setForm((prev) => (prev.staffName ? prev : { ...prev, staffName: name }));
    }
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.siteName.trim() || !form.region.trim() || !form.typeOfStructure.trim() || !form.heightOfTower.trim() || !form.staffName.trim()) {
      setError("All fields are required");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Failed to create");
      setSubmitting(false);
      return;
    }
    const report = await res.json();
    router.push(`/inspections/${report.id}`);
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-6">New Site Inspection</h2>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className="mb-1 block text-sm text-gray-600">Site Name</label>
            <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Region</label>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white">
              <option value="">Select region</option>
              {["North", "Central", "South"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Type of Tower</label>
            <select value={form.typeOfStructure} onChange={(e) => setForm({ ...form, typeOfStructure: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none bg-white">
              <option value="">Select tower type</option>
              {["Lattice", "RDS", "LamPost", "Mono Pole", "Roof Top"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Height of Tower</label>
            <div className="relative">
              <input value={form.heightOfTower} onChange={(e) => setForm({ ...form, heightOfTower: e.target.value })}
                placeholder="e.g. 30"
                className="w-full rounded border px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">m</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Date</label>
            <input type="date" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Name of Staff</label>
            <input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })}
              className="w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {submitting ? "Creating..." : "Start Inspection"}
          </button>
        </form>
      </div>
    </div>
  );
}
