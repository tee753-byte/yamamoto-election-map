import type { WorkStatus } from "@/lib/types/domain";

export const STATUS_CONFIG: Record<
  WorkStatus,
  { label: string; color: string; fillColor: string }
> = {
  not_started: {
    label: "未対応",
    color: "#64748b",
    fillColor: "#cbd5e1",
  },
  assigned: {
    label: "担当中",
    color: "#d97706",
    fillColor: "#fcd34d",
  },
  completed: {
    label: "完了",
    color: "#15803d",
    fillColor: "#86efac",
  },
  needs_review: {
    label: "要確認",
    color: "#b91c1c",
    fillColor: "#fca5a5",
  },
};
