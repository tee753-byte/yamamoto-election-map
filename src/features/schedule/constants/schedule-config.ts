import type {
  AvailabilityStatus,
  ScheduleCategory,
  ScheduleStatus,
} from "@/features/schedule/types/schedule";

export const CATEGORY_CONFIG: Record<
  ScheduleCategory,
  { label: string; tone: string }
> = {
  important: { label: "重要日程", tone: "important" },
  meeting: { label: "打ち合わせ", tone: "meeting" },
  work: { label: "作業予定", tone: "work" },
  deadline: { label: "締切", tone: "deadline" },
  other: { label: "その他", tone: "other" },
};

export const STATUS_CONFIG: Record<ScheduleStatus, { label: string; tone: string }> = {
  confirmed: { label: "確定", tone: "confirmed" },
  tentative: { label: "仮予定", tone: "tentative" },
  needs_review: { label: "要確認", tone: "needsReview" },
  cancelled: { label: "中止", tone: "cancelled" },
};

export const AVAILABILITY_CONFIG: Record<
  AvailabilityStatus,
  { label: string; tone: string }
> = {
  available: { label: "参加可能", tone: "available" },
  unavailable: { label: "参加不可", tone: "unavailable" },
  undecided: { label: "未定", tone: "undecided" },
};
