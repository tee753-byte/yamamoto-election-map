"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import {
  createScheduleEventAction,
  updateScheduleEventAction,
} from "@/features/schedule/actions/schedule-actions";
import {
  CATEGORY_CONFIG,
  STATUS_CONFIG,
} from "@/features/schedule/constants/schedule-config";
import type {
  ScheduleEvent,
  ScheduleEventInput,
} from "@/features/schedule/types/schedule";
import styles from "./schedule.module.css";

interface EventFormProps {
  event?: ScheduleEvent;
  initialDate: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function field(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value || null;
}

export function EventForm({ event, initialDate, onClose, onSaved }: EventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const initialTiming = event?.isAllDay ? "all_day" : event?.timeTbd ? "tbd" : "timed";
  const [timing, setTiming] = useState(initialTiming);

  function submit(eventObject: FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    setMessage("");
    const form = new FormData(eventObject.currentTarget);
    const input: ScheduleEventInput = {
      title: String(form.get("title") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: field(form, "endDate"),
      startTime: timing === "timed" ? field(form, "startTime") : null,
      endTime: timing === "timed" ? field(form, "endTime") : null,
      isAllDay: timing === "all_day",
      timeTbd: timing === "tbd",
      timeNote: field(form, "timeNote"),
      category: String(form.get("category")) as ScheduleEventInput["category"],
      status: String(form.get("status")) as ScheduleEventInput["status"],
      location: field(form, "location"),
      assigneeText: field(form, "assigneeText"),
      description: field(form, "description"),
      confirmationNote: field(form, "confirmationNote"),
      googleMapsUrl: field(form, "googleMapsUrl"),
      relatedUrl: field(form, "relatedUrl"),
    };

    startTransition(async () => {
      const result = event
        ? await updateScheduleEventAction(event.id, event.version, input)
        : await createScheduleEventAction(input);
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
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.kicker}>スケジュール</p>
            <h2 id="event-form-title">{event ? "予定を編集" : "予定を追加"}</h2>
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
        <form className={styles.scheduleForm} onSubmit={submit}>
          <label className={styles.fullField}>
            予定名 <span>必須</span>
            <input
              name="title"
              required
              maxLength={120}
              defaultValue={event?.title ?? ""}
            />
          </label>
          <div className={styles.formGrid}>
            <label>
              開始日 <span>必須</span>
              <input
                name="startDate"
                type="date"
                required
                defaultValue={event?.startDate ?? initialDate}
              />
            </label>
            <label>
              終了日
              <input name="endDate" type="date" defaultValue={event?.endDate ?? ""} />
            </label>
            <label>
              時間の設定
              <select
                value={timing}
                onChange={(change) => setTiming(change.target.value)}
              >
                <option value="timed">時刻を入力・未入力</option>
                <option value="all_day">終日</option>
                <option value="tbd">時間未定</option>
              </select>
            </label>
            <label>
              時刻補足
              <input
                name="timeNote"
                maxLength={120}
                placeholder="例：届出受理後"
                defaultValue={event?.timeNote ?? ""}
              />
            </label>
            {timing === "timed" ? (
              <>
                <label>
                  開始時刻
                  <input
                    name="startTime"
                    type="time"
                    defaultValue={event?.startTime?.slice(0, 5) ?? ""}
                  />
                </label>
                <label>
                  終了時刻
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={event?.endTime?.slice(0, 5) ?? ""}
                  />
                </label>
              </>
            ) : null}
            <label>
              カテゴリ
              <select name="category" defaultValue={event?.category ?? "other"}>
                {Object.entries(CATEGORY_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ステータス <span>必須</span>
              <select name="status" defaultValue={event?.status ?? "tentative"}>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.fullField}>
            場所
            <input
              name="location"
              maxLength={200}
              defaultValue={event?.location ?? ""}
            />
          </label>
          <label className={styles.fullField}>
            担当者・役割
            <input
              name="assigneeText"
              maxLength={300}
              placeholder="例：内田／届出担当"
              defaultValue={event?.assigneeText ?? ""}
            />
          </label>
          <label className={styles.fullField}>
            詳細・備考
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={event?.description ?? ""}
            />
          </label>
          <label className={styles.fullField}>
            要確認事項
            <textarea
              name="confirmationNote"
              rows={3}
              maxLength={1000}
              defaultValue={event?.confirmationNote ?? ""}
            />
          </label>
          <div className={styles.formGrid}>
            <label>
              GoogleマップURL
              <input
                name="googleMapsUrl"
                type="url"
                maxLength={1000}
                defaultValue={event?.googleMapsUrl ?? ""}
              />
            </label>
            <label>
              関連資料URL
              <input
                name="relatedUrl"
                type="url"
                maxLength={1000}
                defaultValue={event?.relatedUrl ?? ""}
              />
            </label>
          </div>
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
