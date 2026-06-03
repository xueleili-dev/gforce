"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/i18n";

const ALLOWED_TYPES = "image/jpeg,image/png,application/pdf";

interface ExistingAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({
    type: "travel",
    title: "",
    description: "",
    amount: "",
    expenseDate: "",
  });
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([]);
  const [newAttachments, setNewAttachments] = useState<
    { filename: string; url: string; size: number; mimeType: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const EXPENSE_TYPES = [
    { value: "travel", label: t("expenseTypes.travel") },
    { value: "procurement", label: t("expenseTypes.procurement") },
    { value: "entertainment", label: t("expenseTypes.entertainment") },
    { value: "general", label: t("expenseTypes.general") },
  ];

  useEffect(() => {
    fetch(`/api/expenses/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setForm({
          type: data.type,
          title: data.title,
          description: data.description,
          amount: String(data.amount),
          expenseDate: data.expenseDate,
        });
        setExistingAttachments(data.attachments || []);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: { filename: string; url: string; size: number; mimeType: string }[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploaded.push({ filename: data.filename, url: data.url, size: data.size, mimeType: data.mimeType });
        }
      } catch { /* skip failed uploads */ }
    }
    setNewAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeNewFile(index: number) {
    setNewAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        title: form.title,
        description: form.description,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        attachments: newAttachments,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message || t("expenseForm.saveFailed"));
      setSubmitting(false);
      return;
    }

    router.push(`/expenses/${id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500">{t("expenses.loading")}</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">{t("expenseDetail.notFound")}</p>
        <button onClick={() => router.push("/expenses")} className="mt-2 text-sm text-indigo-600 hover:underline">
          {t("expenseDetail.backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
        &larr; {t("expenseDetail.back")}
      </button>

      <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 p-6">
        <h2 className="text-xl font-semibold mb-6">{t("expenseForm.editTitle")}</h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.type")}</label>
            <div className="flex gap-2">
              {EXPENSE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    form.type === type.value ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 hover:bg-gray-50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.title")}</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              placeholder={t("expenseForm.titlePlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.amount")}</label>
              <input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.expenseDate")}</label>
              <input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.description")}</label>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
              placeholder={t("expenseForm.descriptionPlaceholder")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("expenseForm.attachments")}</label>
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <input ref={fileInputRef} type="file" multiple accept={ALLOWED_TYPES} onChange={handleFileChange} className="hidden" />

              {existingAttachments.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-gray-400 mb-1">{t("expenseForm.existingFiles")}</p>
                  <ul className="space-y-1">
                    {existingAttachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded bg-white px-3 py-1.5 text-sm border">
                        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate text-gray-600">{a.filename}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {uploading ? t("expenseForm.uploading") : t("expenseForm.selectFile")}
              </button>

              {newAttachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {newAttachments.map((file, i) => (
                    <li key={i} className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-sm border border-indigo-200">
                      <span className="truncate text-indigo-700">{file.filename}</span>
                      <button type="button" onClick={() => removeNewFile(i)} className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-400">{t("expenseForm.uploadHint")}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => router.back()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              {t("expenseForm.cancel")}
            </button>
            <button type="submit" disabled={submitting || uploading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {submitting ? t("expenseForm.saving") : t("expenseForm.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
