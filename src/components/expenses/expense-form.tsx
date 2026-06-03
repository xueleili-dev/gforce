"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const ALLOWED_TYPES = "image/jpeg,image/png,application/pdf";

interface UploadFile {
  name: string;
  size: number;
  mimeType: string;
  url: string;
  id?: string;
}

export function ExpenseForm() {
  const router = useRouter();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    type: "travel",
    title: "",
    project: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [attachments, setAttachments] = useState<UploadFile[]>([]);
  const [projectHistory, setProjectHistory] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/expenses?projects=1").then((r) => r.json()).then(setProjectHistory).catch(() => {});
  }, []);

  const EXPENSE_TYPES = [
    { value: "travel", label: t("expenseTypes.travel") },
    { value: "procurement", label: t("expenseTypes.procurement") },
    { value: "entertainment", label: t("expenseTypes.entertainment") },
    { value: "general", label: t("expenseTypes.general") },
  ];

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploaded: UploadFile[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          uploaded.push({
            name: data.filename,
            size: data.size,
            mimeType: data.mimeType,
            url: data.url,
            id: data.id,
          });
        }
      } catch { /* skip failed uploads */ }
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(isDraft: boolean) {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          project: form.project.trim(),
          isDraft,
          attachments: attachments.map((a) => ({
            filename: a.name,
            url: a.url,
            size: a.size,
            mimeType: a.mimeType,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || t("expenseForm.submitFailed"));
        return;
      }
      router.push("/expenses");
    } catch {
      setError(t("expenseForm.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">{t("expenseForm.newTitle")}</h2>
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("expenseForm.type")}</label>
          <div className="flex gap-2">
            {EXPENSE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setForm({ ...form, type: type.value })}
                className={`rounded border px-4 py-2 text-sm ${
                  form.type === type.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("expenseForm.title")}</label>
          <div className="flex gap-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="flex-1 rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder={t("expenseForm.titlePlaceholder")}
            />
            <input
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              list="expense-project-list"
              className="flex-1 rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Project Name"
            />
            <datalist id="expense-project-list">
              {projectHistory.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("expenseForm.amount")}</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setForm({ ...form, amount: v }); }}
              className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("expenseForm.expenseDate")}</label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
              className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("expenseForm.description")}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="w-full rounded border px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder={t("expenseForm.descriptionPlaceholder")}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t("expenseForm.attachments")}</label>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {uploading ? t("expenseForm.uploading") : t("expenseForm.selectFile")}
            </button>
            <p className="mt-1 text-xs text-gray-400">{t("expenseForm.uploadHint")}</p>
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-1">
                {attachments.map((file, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-sm border">
                    <span className="truncate text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => handleSubmit(true)}
            disabled={submitting || uploading}
          >
            {t("expenseForm.saveDraft")}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={submitting || uploading}>
            {t("expenseForm.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
