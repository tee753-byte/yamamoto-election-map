"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  List,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type CSSProperties, useMemo, useState, useTransition } from "react";
import { deleteScheduleEventAction } from "@/features/schedule/actions/schedule-actions";
import { AvailabilityForm } from "@/features/schedule/components/availability-form";
import { EventForm } from "@/features/schedule/components/event-form";
import {
  AVAILABILITY_CONFIG,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
} from "@/features/schedule/constants/schedule-config";
import type {
  ScheduleAvailability,
  ScheduleEvent,
  ScheduleProfile,
} from "@/features/schedule/types/schedule";
import {
  addMonths,
  compactTime,
  formatJapaneseDate,
  formatMonthTitle,
  isDateWithin,
  monthDays,
} from "@/features/schedule/utils/date";
import type { UserRole } from "@/lib/types/domain";
import styles from "./schedule.module.css";

type ViewMode = "list" | "calendar" | "availability";

interface ScheduleViewProps {
  events: ScheduleEvent[];
  availability: ScheduleAvailability[];
  profiles: ScheduleProfile[];
  today: string;
  currentUserId: string;
  currentUserRole: UserRole;
}

const MEMBER_COLORS = [
  ["#f8e1e5", "#7d2935"],
  ["#e1edf4", "#31586e"],
  ["#e2f0e7", "#38634a"],
  ["#f7ecd9", "#765425"],
  ["#ece7f6", "#5b4775"],
] as const;

function memberStyle(userId: string, profiles: ScheduleProfile[]): CSSProperties {
  const index = Math.max(
    0,
    profiles.findIndex((profile) => profile.id === userId),
  );
  const [background, color] = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return { "--member-bg": background, "--member-color": color } as CSSProperties;
}

function eventTime(event: ScheduleEvent) {
  if (event.isAllDay) return "終日";
  if (event.timeTbd) return event.timeNote || "時間未定";
  const start = compactTime(event.startTime);
  const end = compactTime(event.endTime);
  if (start && end) return `${start}〜${end}`;
  if (start) return `${start}〜`;
  return event.timeNote || "時刻未定";
}

function availabilityTime(item: ScheduleAvailability) {
  if (item.status !== "available") return AVAILABILITY_CONFIG[item.status].label;
  if (item.isAllDay) return "終日";
  return `${compactTime(item.startTime)}〜${compactTime(item.endTime)}`;
}

export function ScheduleView({
  events,
  availability,
  profiles,
  today,
  currentUserId,
  currentUserRole,
}: ScheduleViewProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent>();
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | "new">();
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState(today);
  const [availabilityDetail, setAvailabilityDetail] = useState<ScheduleAvailability>();
  const [notice, setNotice] = useState("");
  const [isDeleting, startDelete] = useTransition();
  const canWrite = currentUserRole !== "viewer";

  const groupedEvents = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of events) {
      const list = map.get(event.startDate) ?? [];
      list.push(event);
      map.set(event.startDate, list);
    }
    return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [events]);

  const groupedAvailability = useMemo(() => {
    const map = new Map<string, ScheduleAvailability[]>();
    for (const item of availability) {
      const list = map.get(item.availabilityDate) ?? [];
      list.push(item);
      map.set(item.availabilityDate, list);
    }
    return [...map.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [availability]);

  function availableForDate(date: string) {
    return availability.filter(
      (item) => item.availabilityDate === date && item.status === "available",
    );
  }

  function openAvailability(date: string) {
    setAvailabilityDate(date);
    setAvailabilityOpen(true);
  }

  function removeEvent(event: ScheduleEvent) {
    if (!window.confirm(`「${event.title}」を削除しますか？`)) return;
    setNotice("");
    startDelete(async () => {
      const result = await deleteScheduleEventAction(event.id, event.version);
      setNotice(result.message);
      if (result.ok) {
        setSelectedEvent(undefined);
        router.refresh();
      }
    });
  }

  function availabilityChips(date: string) {
    const items = availableForDate(date);
    if (items.length === 0) return null;
    return (
      <div className={styles.memberChips}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.memberChip}
            style={memberStyle(item.userId, profiles)}
            onClick={() => setAvailabilityDetail(item)}
          >
            <strong>{item.userName}</strong> {availabilityTime(item)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.schedulePage}>
      <section className={styles.scheduleHero}>
        <span className={styles.heroIcon}>
          <CalendarDays size={26} aria-hidden />
        </span>
        <div>
          <p>予定・情報共有</p>
          <h1>スケジュール</h1>
          <span>予定とメンバーの参加可能時間を共有します。</span>
        </div>
        {canWrite ? (
          <button
            className={styles.addButton}
            type="button"
            onClick={() => setEditingEvent("new")}
          >
            <Plus size={18} /> 予定を追加
          </button>
        ) : null}
      </section>

      <nav className={styles.viewTabs} aria-label="スケジュール表示">
        <button
          type="button"
          className={view === "list" ? styles.activeTab : ""}
          onClick={() => setView("list")}
        >
          <List size={17} /> 予定一覧
        </button>
        <button
          type="button"
          className={view === "calendar" ? styles.activeTab : ""}
          onClick={() => setView("calendar")}
        >
          <CalendarDays size={17} /> 月間カレンダー
        </button>
        <button
          type="button"
          className={view === "availability" ? styles.activeTab : ""}
          onClick={() => setView("availability")}
        >
          <UsersRound size={17} /> 参加可能日
        </button>
      </nav>

      {notice ? <output className={styles.notice}>{notice}</output> : null}

      {view === "list" ? (
        <section className={styles.listPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>時系列</p>
              <h2>共有スケジュール</h2>
            </div>
            {canWrite ? (
              <button
                type="button"
                className={styles.availabilityButton}
                onClick={() => openAvailability(today)}
              >
                参加可能時間を登録
              </button>
            ) : null}
          </div>
          {groupedEvents.length === 0 ? (
            <p className={styles.emptyState}>予定はまだ登録されていません。</p>
          ) : null}
          {groupedEvents.map(([date, dateEvents]) => (
            <article className={styles.dayGroup} key={date}>
              <header className={styles.dayHeader}>
                <time dateTime={date}>{formatJapaneseDate(date, true)}</time>
                {canWrite ? (
                  <button type="button" onClick={() => openAvailability(date)}>
                    この日の参加可能時間
                  </button>
                ) : null}
              </header>
              <div className={styles.dayEvents}>
                {dateEvents.map((event) => {
                  const status = STATUS_CONFIG[event.status];
                  const category = CATEGORY_CONFIG[event.category];
                  return (
                    <button
                      key={event.id}
                      type="button"
                      className={`${styles.eventRow} ${event.status === "cancelled" ? styles.cancelledEvent : ""}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <span
                        className={`${styles.categoryBar} ${styles[category.tone]}`}
                      />
                      <span className={styles.eventMain}>
                        <span className={styles.eventTitleLine}>
                          <strong>{event.title}</strong>
                          <span
                            className={`${styles.statusBadge} ${styles[status.tone]}`}
                          >
                            {status.label}
                          </span>
                        </span>
                        <span className={styles.eventMeta}>
                          <Clock3 size={14} /> {eventTime(event)}
                          {event.endDate && event.endDate !== event.startDate
                            ? `・〜${formatJapaneseDate(event.endDate)}`
                            : ""}
                          {event.location ? (
                            <>
                              <MapPin size={14} /> {event.location}
                            </>
                          ) : null}
                        </span>
                        {event.confirmationNote ? (
                          <span className={styles.confirmation}>
                            要確認：{event.confirmationNote}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  );
                })}
              </div>
              {availabilityChips(date)}
            </article>
          ))}
        </section>
      ) : null}

      {view === "calendar" ? (
        <section className={styles.calendarPanel}>
          <div className={styles.calendarToolbar}>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              aria-label="前の月"
            >
              <ChevronLeft />
            </button>
            <h2>{formatMonthTitle(month)}</h2>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="次の月"
            >
              <ChevronRight />
            </button>
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => setMonth(today.slice(0, 7))}
            >
              今日
            </button>
          </div>
          <div className={styles.weekHeader}>
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {monthDays(month).map((date) => {
              const dateEvents = events.filter((event) =>
                isDateWithin(date, event.startDate, event.endDate),
              );
              const outside = date.slice(0, 7) !== month;
              return (
                <div
                  key={date}
                  className={`${styles.calendarDay} ${outside ? styles.outsideMonth : ""} ${date === today ? styles.today : ""}`}
                >
                  <button
                    type="button"
                    className={styles.dateButton}
                    onClick={() => canWrite && openAvailability(date)}
                    aria-label={`${formatJapaneseDate(date)}の参加可能時間`}
                  >
                    {Number(date.slice(-2))}
                  </button>
                  <div className={styles.calendarEvents}>
                    {dateEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`${styles.calendarEvent} ${styles[CATEGORY_CONFIG[event.category].tone]}`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dateEvents.length > 3 ? (
                      <span>ほか{dateEvents.length - 3}件</span>
                    ) : null}
                  </div>
                  {availableForDate(date).length > 0 ? (
                    <span className={styles.availabilityCount}>
                      {availableForDate(date).length}人可
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "availability" ? (
        <section className={styles.listPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>メンバー</p>
              <h2>参加可能日・時間</h2>
            </div>
            {canWrite ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => openAvailability(today)}
              >
                <Plus size={17} /> 登録・編集
              </button>
            ) : null}
          </div>
          <p className={styles.helperText}>
            未回答と「参加不可」は別に扱います。予定がない日も登録できます。
          </p>
          {groupedAvailability.length === 0 ? (
            <p className={styles.emptyState}>参加可能情報はまだ登録されていません。</p>
          ) : null}
          {groupedAvailability.map(([date, items]) => (
            <article className={styles.availabilityGroup} key={date}>
              <time dateTime={date}>{formatJapaneseDate(date, true)}</time>
              <div className={styles.memberChips}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.memberChip} ${styles[AVAILABILITY_CONFIG[item.status].tone]}`}
                    style={memberStyle(item.userId, profiles)}
                    onClick={() => setAvailabilityDetail(item)}
                  >
                    <strong>{item.userName}</strong> {availabilityTime(item)}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {editingEvent ? (
        <EventForm
          event={editingEvent === "new" ? undefined : editingEvent}
          initialDate={today}
          onClose={() => setEditingEvent(undefined)}
          onSaved={setNotice}
        />
      ) : null}

      {availabilityOpen ? (
        <AvailabilityForm
          availability={availability}
          profiles={profiles}
          currentUserId={currentUserId}
          isAdmin={currentUserRole === "admin"}
          initialDate={availabilityDate}
          onClose={() => setAvailabilityOpen(false)}
          onSaved={setNotice}
        />
      ) : null}

      {selectedEvent ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={`${styles.modal} ${styles.modalSmall}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-detail-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>
                  {CATEGORY_CONFIG[selectedEvent.category].label}
                </p>
                <h2 id="event-detail-title">{selectedEvent.title}</h2>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setSelectedEvent(undefined)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className={styles.detailBadges}>
              <span
                className={`${styles.statusBadge} ${styles[STATUS_CONFIG[selectedEvent.status].tone]}`}
              >
                {STATUS_CONFIG[selectedEvent.status].label}
              </span>
              <span>
                {formatJapaneseDate(selectedEvent.startDate, true)}
                {selectedEvent.endDate &&
                selectedEvent.endDate !== selectedEvent.startDate
                  ? `〜${formatJapaneseDate(selectedEvent.endDate, true)}`
                  : ""}
              </span>
              <span>{eventTime(selectedEvent)}</span>
            </div>
            <dl className={styles.detailList}>
              {selectedEvent.location ? (
                <div>
                  <dt>場所</dt>
                  <dd>{selectedEvent.location}</dd>
                </div>
              ) : null}
              {selectedEvent.assigneeText ? (
                <div>
                  <dt>担当者・役割</dt>
                  <dd>{selectedEvent.assigneeText}</dd>
                </div>
              ) : null}
              {selectedEvent.description ? (
                <div>
                  <dt>詳細・備考</dt>
                  <dd>{selectedEvent.description}</dd>
                </div>
              ) : null}
              {selectedEvent.confirmationNote ? (
                <div>
                  <dt>要確認事項</dt>
                  <dd>{selectedEvent.confirmationNote}</dd>
                </div>
              ) : null}
              <div>
                <dt>登録者</dt>
                <dd>{selectedEvent.creatorName}</dd>
              </div>
              <div>
                <dt>最終更新</dt>
                <dd>{selectedEvent.updaterName}</dd>
              </div>
            </dl>
            {availabilityChips(selectedEvent.startDate)}
            <div className={styles.detailLinks}>
              {selectedEvent.googleMapsUrl ? (
                <a href={selectedEvent.googleMapsUrl} target="_blank" rel="noreferrer">
                  <MapPin size={16} /> Googleマップ <ExternalLink size={14} />
                </a>
              ) : null}
              {selectedEvent.relatedUrl ? (
                <a href={selectedEvent.relatedUrl} target="_blank" rel="noreferrer">
                  関連資料 <ExternalLink size={14} />
                </a>
              ) : null}
            </div>
            {canWrite ? (
              <div className={styles.formActions}>
                {currentUserRole === "admin" ||
                selectedEvent.createdBy === currentUserId ? (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={isDeleting}
                    onClick={() => removeEvent(selectedEvent)}
                  >
                    <Trash2 size={16} /> 削除
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setSelectedEvent(undefined);
                  }}
                >
                  <Pencil size={16} /> 編集
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {availabilityDetail ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={`${styles.modal} ${styles.modalSmall}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-detail-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>参加可能情報</p>
                <h2 id="availability-detail-title">{availabilityDetail.userName}</h2>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setAvailabilityDetail(undefined)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <dl className={styles.detailList}>
              <div>
                <dt>日付</dt>
                <dd>{formatJapaneseDate(availabilityDetail.availabilityDate, true)}</dd>
              </div>
              <div>
                <dt>状態</dt>
                <dd>{AVAILABILITY_CONFIG[availabilityDetail.status].label}</dd>
              </div>
              <div>
                <dt>時間</dt>
                <dd>{availabilityTime(availabilityDetail)}</dd>
              </div>
              {availabilityDetail.note ? (
                <div>
                  <dt>備考</dt>
                  <dd>{availabilityDetail.note}</dd>
                </div>
              ) : null}
              <div>
                <dt>最終更新者</dt>
                <dd>{availabilityDetail.updaterName}</dd>
              </div>
            </dl>
            {canWrite &&
            (currentUserRole === "admin" ||
              availabilityDetail.userId === currentUserId) ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setAvailabilityDate(availabilityDetail.availabilityDate);
                  setAvailabilityDetail(undefined);
                  setAvailabilityOpen(true);
                }}
              >
                <Pencil size={16} /> 編集する
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
