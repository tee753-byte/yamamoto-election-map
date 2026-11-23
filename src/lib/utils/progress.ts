import type { ProgressSummary, WorkStatus } from "@/lib/types/domain";

export function calculateProgress(statuses: WorkStatus[]): ProgressSummary {
  const counts: Record<WorkStatus, number> = {
    not_started: 0,
    assigned: 0,
    completed: 0,
    needs_review: 0,
  };

  for (const status of statuses) {
    counts[status] += 1;
  }

  const total = statuses.length;
  const completed = counts.completed;

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.floor((completed / total) * 100),
    counts,
  };
}
