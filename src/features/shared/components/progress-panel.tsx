import { STATUS_CONFIG } from "@/features/shared/constants/status-config";
import { WORK_STATUS_ORDER } from "@/lib/constants/app";
import type { ProgressSummary } from "@/lib/types/domain";

interface ProgressPanelProps {
  title: string;
  summary: ProgressSummary;
  countUnit: string;
}

export function ProgressPanel({ title, summary, countUnit }: ProgressPanelProps) {
  return (
    <section className="progress-panel" aria-labelledby={`${title}-heading`}>
      <div className="progress-heading">
        <div>
          <p className="eyebrow">進捗状況</p>
          <h2 id={`${title}-heading`}>{title}</h2>
        </div>
        <strong className="progress-percent">{summary.percent}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={summary.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title}の完了率`}
      >
        <span style={{ width: `${summary.percent}%` }} />
      </div>
      <p className="progress-copy">
        {summary.completed}
        {countUnit}完了 / 全{summary.total}
        {countUnit}
      </p>
      <div className="status-summary-grid">
        {WORK_STATUS_ORDER.map((status) => (
          <div className="status-summary-item" key={status}>
            <span
              className="status-dot"
              style={{ backgroundColor: STATUS_CONFIG[status].color }}
            />
            <span>{STATUS_CONFIG[status].label}</span>
            <strong>{summary.counts[status]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
