"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useI18n } from "@/i18n";

export default function InspectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [images, setImages] = useState<{ beforeImage: string; afterImage: string; description: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/inspections/${reportId}`).then((r) => r.json()).then((rep) => {
      setReport(rep);
      // Pre-load existing grades/comments so a report can be edited
      const g: Record<string, string> = {};
      const c: Record<string, string> = {};
      (rep.results || []).forEach((res: any) => {
        g[res.itemId] = res.grade;
        c[res.itemId] = res.comment || "";
      });
      setGrades(g);
      setComments(c);
      // Pre-load existing images
      setImages((rep.images || []).map((img: any) => ({
        beforeImage: img.beforeImage,
        afterImage: img.afterImage,
        description: img.description || "",
      })));
    });
    fetch("/api/inspections/checklist").then((r) => r.json()).then(setChecklist).finally(() => setLoading(false));
  }, [reportId]);

  function setGrade(itemId: string, grade: string) {
    setGrades((prev) => ({ ...prev, [itemId]: grade }));
  }

  function setComment(itemId: string, comment: string) {
    setComments((prev) => ({ ...prev, [itemId]: comment }));
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    return data.url;
  }

  async function addImageRow() {
    setImages([...images, { beforeImage: "", afterImage: "", description: "" }]);
  }

  function updateImageRow(i: number, field: string, value: string) {
    setImages((prev) => prev.map((img, idx) => idx === i ? { ...img, [field]: value } : img));
  }

  async function handleUploadBefore(i: number, file: File) {
    const url = await uploadImage(file);
    updateImageRow(i, "beforeImage", url);
  }

  async function handleUploadAfter(i: number, file: File) {
    const url = await uploadImage(file);
    updateImageRow(i, "afterImage", url);
  }

  async function handleSubmit() {
    // Require a grade for every checklist item
    const allItems = checklist.flatMap((section: any) => section.items);
    const ungraded = allItems.filter((item: any) => !grades[item.id]);
    if (ungraded.length > 0) {
      alert(`Please select a grade (A/B/C) for every item. ${ungraded.length} item(s) remaining.`);
      return;
    }

    // B/C grades require a text description
    const missingComments = allItems.filter((item: any) => {
      const g = grades[item.id];
      return (g === "B" || g === "C") && !(comments[item.id] || "").trim();
    });
    if (missingComments.length > 0) {
      alert(`Please add a description for ${missingComments.length} item(s) graded B or C.`);
      return;
    }

    setSubmitting(true);
    const results = allItems.map((item: any) => ({
      itemId: item.id,
      grade: grades[item.id],
      comment: comments[item.id] || "",
    }));

    // Save results
    const res1 = await fetch(`/api/inspections/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveResults", results }),
    });
    if (!res1.ok) {
      const d = await res1.json().catch(() => ({}));
      alert(d.error || "Failed to save");
      setSubmitting(false);
      return;
    }

    // Save images (replaces existing set)
    const res2 = await fetch(`/api/inspections/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveImages", images }),
    });
    if (!res2.ok) {
      alert("Failed to save photos");
      setSubmitting(false);
      return;
    }

    // Submit (mark submitted; no PDF)
    const res3 = await fetch(`/api/inspections/${reportId}`, { method: "POST" });
    if (!res3.ok) {
      alert("Submit failed");
      setSubmitting(false);
      return;
    }

    router.push("/inspections");
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-2">Site Inspection Checklist</h2>
      {report && (
        <p className="text-sm text-gray-500 mb-6">
          {report.siteName} · {report.region} · {report.typeOfStructure} · {report.heightOfTower}
        </p>
      )}

      {/* Checklist */}
      {checklist.map((section: any) => (
        <div key={section.id} className="mb-6 rounded-lg bg-white shadow-sm border border-slate-200/60">
          <h3 className="px-4 py-3 font-medium text-sm border-b bg-gray-50">{section.title}</h3>
          <div className="p-4">
            {section.items.map((item: any) => {
              const grade = grades[item.id] || "";
              return (
                <div key={item.id} className="mb-3 pb-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold w-10">{item.code}</span>
                    <span className="flex-1 text-sm">{item.title}</span>
                    <div className="flex gap-1">
                      {["A", "B", "C"].map((g) => (
                        <button key={g} onClick={() => setGrade(item.id, g)}
                          className={`px-3 py-1 text-xs rounded border ${grade === g ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-gray-600 hover:bg-gray-50"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  {(grade === "B" || grade === "C") && (
                    <div className="mt-2 ml-10">
                      <textarea value={comments[item.id] || ""} onChange={(e) => setComment(item.id, e.target.value)}
                        placeholder={`Describe repairs required (Grade ${grade})`}
                        rows={2}
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Images */}
      <div className="mb-6 rounded-lg bg-white shadow-sm border border-slate-200/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">Rectification Photos</h3>
          <button onClick={addImageRow} className="text-sm text-blue-600 hover:text-blue-700">+ Add Photo Pair</button>
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-gray-400">No photos added</p>
        ) : images.map((img, i) => (
          <div key={i} className="mb-4 p-3 border rounded">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Before Image</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadBefore(i, e.target.files[0])} className="text-xs" />
                {img.beforeImage && <img src={img.beforeImage} alt="before" className="mt-2 h-24 object-cover rounded" />}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">After Image</label>
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadAfter(i, e.target.files[0])} className="text-xs" />
                {img.afterImage && <img src={img.afterImage} alt="after" className="mt-2 h-24 object-cover rounded" />}
              </div>
            </div>
            <input value={img.description} onChange={(e) => updateImageRow(i, "description", e.target.value)}
              placeholder="Description (optional)" className="w-full rounded border px-3 py-1.5 text-sm" />
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
        {submitting ? "Submitting..." : "Submit Inspection"}
      </button>
    </div>
  );
}
