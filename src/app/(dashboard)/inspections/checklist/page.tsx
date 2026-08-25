"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChecklistManagePage() {
  const router = useRouter();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSection, setNewSection] = useState("");
  const [newItem, setNewItem] = useState<{ [sectionId: string]: { code: string; title: string } }>({});

  function load() {
    fetch("/api/inspections/checklist").then((r) => r.json()).then(setSections).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function addSection() {
    if (!newSection.trim()) return;
    await fetch("/api/inspections/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "section", title: newSection.trim() }),
    });
    setNewSection("");
    load();
  }

  async function deleteSection(id: string) {
    if (!confirm("Delete this section and all its items?")) return;
    await fetch(`/api/inspections/checklist?type=section&id=${id}`, { method: "DELETE" });
    load();
  }

  async function addItem(sectionId: string) {
    const item = newItem[sectionId];
    if (!item?.code.trim() || !item?.title.trim()) return;
    await fetch("/api/inspections/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "item", sectionId, code: item.code.trim(), title: item.title.trim() }),
    });
    setNewItem({ ...newItem, [sectionId]: { code: "", title: "" } });
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/inspections/checklist?type=item&id=${id}`, { method: "DELETE" });
    load();
  }

  function setItemField(sectionId: string, field: string, value: string) {
    setNewItem((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || { code: "", title: "" }), [field]: value },
    }));
  }

  return (
    <div>
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4">&larr; Back</button>
      <h2 className="text-xl font-semibold mb-6">Manage Checklist</h2>

      {/* Add section */}
      <div className="flex gap-2 mb-6">
        <input value={newSection} onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section title"
          className="flex-1 rounded border px-3 py-2 text-sm" />
        <button onClick={addSection} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Add Section</button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="rounded-lg bg-white shadow-sm border border-slate-200/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">{section.title}</h3>
                <button onClick={() => deleteSection(section.id)} className="text-sm text-red-600 hover:underline">Delete Section</button>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-3">
                {section.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="w-10 text-xs font-bold">{item.code}</span>
                    <span className="flex-1">{item.title}</span>
                    <button onClick={() => deleteItem(item.id)} className="text-red-600 hover:underline text-xs">Delete</button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="flex gap-2">
                <input value={newItem[section.id]?.code || ""} onChange={(e) => setItemField(section.id, "code", e.target.value)}
                  placeholder="Code (e.g. 1.1)" className="w-24 rounded border px-2 py-1.5 text-sm" />
                <input value={newItem[section.id]?.title || ""} onChange={(e) => setItemField(section.id, "title", e.target.value)}
                  placeholder="Item title" className="flex-1 rounded border px-2 py-1.5 text-sm" />
                <button onClick={() => addItem(section.id)} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700">Add</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
