"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import { useToast } from "@/components/ui/toast";

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<"inbound" | "outbound">("outbound");

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Outbound
  const [outOrders, setOutOrders] = useState<any[]>([]);
  const [outPage, setOutPage] = useState(1);
  const [outTotal, setOutTotal] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [inCancelling, setInCancelling] = useState<string | null>(null);

  // Inbound
  const [inOrders, setInOrders] = useState<any[]>([]);
  const [inPage, setInPage] = useState(1);
  const [inTotal, setInTotal] = useState(0);

  const loadOutbound = useCallback(() => {
    const p = new URLSearchParams({ page: String(outPage), pageSize: "20" });
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    fetch(`/api/materials/outbound?${p}`).then((r) => r.json()).then((d) => {
      setOutOrders(d.items || []); setOutTotal(d.total || 0);
    });
  }, [outPage, startDate, endDate]);

  const loadInbound = useCallback(() => {
    const p = new URLSearchParams({ page: String(inPage), pageSize: "20" });
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    fetch(`/api/materials/inbound?${p}`).then((r) => r.json()).then((d) => {
      setInOrders(d.items || []); setInTotal(d.total || 0);
    });
  }, [inPage, startDate, endDate]);

  useEffect(() => {
    if (tab === "outbound") loadOutbound(); else loadInbound();
  }, [tab, loadOutbound, loadInbound]);

  async function handleCancel(orderId: string) {
    if (!confirm(t("material.cancelOrder"))) return;
    setCancelling(orderId);
    const res = await fetch(`/api/materials/outbound/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (!res.ok) { toast("Cancel failed", "error"); setCancelling(null); return; }
    toast("Order cancelled, stock restored");
    setCancelling(null);
    loadOutbound();
  }

  async function handleInboundCancel(orderId: string) {
    if (!confirm("Cancel this inbound order? Stock will be reduced.")) return;
    setInCancelling(orderId);
    const res = await fetch("/api/materials/inbound", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", orderId }),
    });
    if (!res.ok) { toast("Cancel failed", "error"); setInCancelling(null); return; }
    toast("Inbound order cancelled, stock adjusted");
    setInCancelling(null);
    loadInbound();
  }

  const outPages = Math.max(1, Math.ceil(outTotal / 20));
  const inPages = Math.max(1, Math.ceil(inTotal / 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Orders</h2>
        <div className="flex gap-2">
          <button onClick={() => router.push("/materials/inbound")} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
            + {t("material.addStock")}
          </button>
          <button onClick={() => router.push("/materials/outbound")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            + {t("material.outbound")}
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-end gap-2 mb-4">
        <div>
          <label className="block text-[10px] text-gray-400 mb-0.5">From</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setOutPage(1); setInPage(1); }}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-0.5">To</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setOutPage(1); setInPage(1); }}
            className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border-b border-slate-200">
        <button onClick={() => setTab("outbound")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "outbound" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>{t("material.outbound")} Orders</button>
        <button onClick={() => setTab("inbound")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "inbound" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}>{t("material.inbound")} Orders</button>
      </div>

      {tab === "outbound" ? (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{t("material.date")}</th>
                <th className="px-3 py-2 text-left">{t("material.customer")}</th>
                <th className="px-3 py-2 text-left">{t("material.project")}</th>
                <th className="px-3 py-2 text-left">Items</th>
                <th className="px-3 py-2 text-left">{t("material.operator")}</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {outOrders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No outbound orders</td></tr>
              ) : outOrders.map((o) => {
                const itemList = (o.items as any[]);
                const itemNames = itemList.map((it: any) => `${it.name} x${it.quantity}`).join(", ");
                return (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 font-medium">{o.customerName}</td>
                    <td className="px-3 py-2 text-gray-500">{o.project || "-"}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{itemNames || "-"}</td>
                    <td className="px-3 py-2 text-gray-500">{o.operatorName}</td>
                    <td className="px-3 py-2 text-center">
                      {o.cancelled ? (
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Cancelled</span>
                      ) : (
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!o.cancelled && (
                        <button onClick={() => handleCancel(o.id)} disabled={cancelling === o.id}
                          className="text-sm text-red-600 hover:underline disabled:opacity-40">
                          {cancelling === o.id ? "..." : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {outTotal > 0 && (
            <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-500 border-t">
              <span>{outTotal} orders</span>
              <div className="flex gap-1">
                <button onClick={() => setOutPage((p) => Math.max(1, p - 1))} disabled={outPage <= 1}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&larr;</button>
                <span className="px-2 py-0.5">{outPage} / {outPages}</span>
                <button onClick={() => setOutPage((p) => Math.min(outPages, p + 1))} disabled={outPage >= outPages}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&rarr;</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm border border-slate-200/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">{t("material.date")}</th>
                <th className="px-3 py-2 text-left">Items</th>
                <th className="px-3 py-2 text-left">{t("material.operator")}</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {inOrders.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No inbound orders</td></tr>
              ) : inOrders.map((o) => (
                <tr key={o.orderId} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                    {o.items.map((it: any) => `${it.materialName} x${it.quantity}${it.unit}`).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{o.operatorName}</td>
                  <td className="px-3 py-2 text-center">
                    {o.cancelled ? (
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Cancelled</span>
                    ) : (
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!o.cancelled && (
                      <button onClick={() => handleInboundCancel(o.orderId)} disabled={inCancelling === o.orderId}
                        className="text-sm text-red-600 hover:underline disabled:opacity-40">
                        {inCancelling === o.orderId ? "..." : "Cancel"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inTotal > 0 && (
            <div className="px-4 py-3 flex items-center justify-between text-sm text-gray-500 border-t">
              <span>{inTotal} orders</span>
              <div className="flex gap-1">
                <button onClick={() => setInPage((p) => Math.max(1, p - 1))} disabled={inPage <= 1}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&larr;</button>
                <span className="px-2 py-0.5">{inPage} / {inPages}</span>
                <button onClick={() => setInPage((p) => Math.min(inPages, p + 1))} disabled={inPage >= inPages}
                  className="rounded border px-2 py-0.5 hover:bg-gray-50 disabled:opacity-30">&rarr;</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
