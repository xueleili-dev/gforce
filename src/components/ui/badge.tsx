"use client";

import { useI18n } from "@/i18n";

interface BadgeProps { status: string; }

const COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", submitted: "bg-blue-100 text-blue-700",
  level1_approval: "bg-yellow-100 text-yellow-700", level2_approval: "bg-yellow-100 text-yellow-700",
  countersign: "bg-purple-100 text-purple-700", finance_review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700", paid: "bg-green-200 text-green-800",
  rejected: "bg-red-100 text-red-700", withdrawn: "bg-gray-100 text-gray-500",
};

export function Badge({ status }: BadgeProps) {
  const { t } = useI18n();
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[status] || "bg-gray-100"}`}>
      {t(`status.${status}`)}
    </span>
  );
}
