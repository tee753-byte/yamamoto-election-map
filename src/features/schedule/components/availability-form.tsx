"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { upsertScheduleAvailabilityAction } from "@/features/schedule/actions/schedule-actions";
import { AVAILABILITY_CONFIG } from "@/features/schedule/constants/schedule-config";
import type {
  AvailabilityInput,
  ScheduleAvailability,
  ScheduleProfile,
} from "@/features/schedule/types/schedule";
import styles from "./schedule.module.css";

interface AvailabilityFormProps {
  availability: ScheduleAvailability[];
  profiles: ScheduleProfile[];
  currentUserId: string;
  isAdmin: boolean;
  initialDate: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function AvailabilityForm({
  availability,
  profiles,
  currentUserId,
  isAdmin,
  initialDate,
  onClose,
  onSaved,
}: AvailabilityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState(currentUserId);
  const [date, setDate] = useState(initialDate);
  const existing = useMemo(
    () =>
      availability.find(
        (item) => item.userId === userId && item.availabilityDate === date,
      ),
    [availability, date, userId],
  );
  const [status, setStatus] = useState<AvailabilityInput["status"]>(
    existing?.status ?? "available",
  );
  const [allDay, setAllDay] = useState(existing?.isAllDay ?? true);
  const [message, setMessage] = useState("");

  function syncExisting(nextUserId: string, nextDate: string) {
    const next = availability.find(
      (item) => item.userId === nextUserId && item.availabilityDate === nextDate,
    );
    setStatus(next?.status ?? "available");
    setAllDay(next?.isAllDay ?? true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const current = availability.find(
      (item) => item.userId === userId && item.availabilityDate === date,
    );
    const startTime = String(form.get("startTime") ?? "") || null;
    const endTime = String(form.get("endTime") ?? "") || null;
    const note = String(form.get("note") ?? "").trim() || null;
    const input: AvailabilityInput = {
      availabilityId: current?.id ?? null,
      expectedVersion: current?.version ?? null,
      userId,
      availabilityDate: date,
      status,
      isAllDay: status === "available" && allDay,
      startTime: status === "available" && !allDay ? startTime : null,
      endTime: status === "available" && !allDay ? endTime : null,
      note,
    };

    startTransition(async () => {
      const result = await upsertScheduleAvailabilityAction(input);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      onSaved(result.message);
      onClose();
      router.refresh();
    });
  }

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section
        className={`${styles.modal} ${styles.modalSmall}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-form-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.kicker}>参加可能日</p>
            <h2 id="availability-form-title">参加可能時間を登録</h2>
          </div>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <form
          className={styles.scheduleForm}
          key={`${userId}-${date}-${existing?.version ?? 0}`}
          onSubmit={submit}
        >
          {isAdmin ? (
            <label className={styles.fullField}>
              メンバー
              <select
                value={userId}
                onChange={(change) => {
                  setUserId(change.target.value);
                  syncExisting(change.target.value, date);
                }}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={styles.fullField}>
            日付 <span>必須</span>
            <input
              type="date"
              required
              value={date}
              onChange={(change) => {
                setDate(change.target.value);
                syncExisting(userId, change.target.value);
              }}
            />
          </label>
          <label className={styles.fullField}>
            状態
            <select
              value={status}
              onChange={(change) =>
                setStatus(change.target.value as AvailabilityInput["status"])
              }
            >
              {Object.entries(AVAILABILITY_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
          {status === "available" ? (
            <>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(change) => setAllDay(change.target.checked)}
                />
                終日参加可能
              </label>
              {!allDay ? (
                <div className={styles.formGrid}>
                  <label>
                    開始時刻 <span>必須</span>
                    <input
                      name="startTime"
                      type="time"
                      required
                      defaultValue={existing?.startTime?.slice(0, 5) ?? ""}
                    />
                  </label>
                  <label>
                    終了時刻 <span>必須</span>
                    <input
                      name="endTime"
                      type="time"
                      required
                      defaultValue={existing?.endTime?.slice(0, 5) ?? ""}
                    />
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
          <label className={styles.fullField}>
            備考
            <textarea
              name="note"
              rows={3}
              maxLength={500}
              defaultValue={existing?.note ?? ""}
            />
          </label>
          {existing ? (
            <p className={styles.helperText}>この日付の登録内容を更新します。</p>
          ) : null}
          {message ? (
            <p className={styles.formError} role="alert">
              {message}
            </p>
          ) : null}
          <div className={styles.formActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isPending}>
              {isPending ? "保存中…" : "保存する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
