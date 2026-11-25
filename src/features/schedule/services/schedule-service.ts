import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AvailabilityInput,
  ScheduleAvailability,
  ScheduleEvent,
  ScheduleEventInput,
  ScheduleProfile,
} from "@/features/schedule/types/schedule";
import { todayInTokyo } from "@/features/schedule/utils/date";
import { sortScheduleProfiles } from "@/features/schedule/utils/members";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/domain";

interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  time_tbd: boolean;
  time_note: string | null;
  category: ScheduleEvent["category"];
  status: ScheduleEvent["status"];
  location: string | null;
  assignee_text: string | null;
  description: string | null;
  confirmation_note: string | null;
  google_maps_url: string | null;
  related_url: string | null;
  created_by: string;
  updated_by: string;
  version: number;
  created_at: string;
  updated_at: string;
  creator: { display_name: string } | null;
  updater: { display_name: string } | null;
}

interface AvailabilityRow {
  id: string;
  user_id: string;
  availability_date: string;
  status: ScheduleAvailability["status"];
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
  updated_by: string;
  version: number;
  updated_at: string;
  profile: { display_name: string } | null;
  updater: { display_name: string } | null;
}

interface ProfileRow {
  id: string;
  display_name: string;
  role: UserRole;
}

function mapEvent(row: EventRow): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    isAllDay: row.is_all_day,
    timeTbd: row.time_tbd,
    timeNote: row.time_note,
    category: row.category,
    status: row.status,
    location: row.location,
    assigneeText: row.assignee_text,
    description: row.description,
    confirmationNote: row.confirmation_note,
    googleMapsUrl: row.google_maps_url,
    relatedUrl: row.related_url,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    creatorName: row.creator?.display_name ?? "不明",
    updaterName: row.updater?.display_name ?? "不明",
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listScheduleEvents(): Promise<ScheduleEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .select(
      "id, title, start_date, end_date, start_time, end_time, is_all_day, time_tbd, time_note, category, status, location, assignee_text, description, confirmation_note, google_maps_url, related_url, created_by, updated_by, version, created_at, updated_at, creator:profiles!schedule_events_created_by_fkey(display_name), updater:profiles!schedule_events_updated_by_fkey(display_name)",
    )
    .order("start_date")
    .order("start_time", { nullsFirst: false });

  if (error) throw new Error(`予定の取得に失敗しました: ${error.message}`);
  return ((data ?? []) as unknown as EventRow[]).map(mapEvent);
}

export async function listUpcomingScheduleEvents(limit = 3) {
  const today = todayInTokyo();
  const events = await listScheduleEvents();
  return events
    .filter(
      (event) =>
        (event.endDate ?? event.startDate) >= today && event.status !== "cancelled",
    )
    .slice(0, limit);
}

export async function listScheduleAvailability(): Promise<ScheduleAvailability[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_availability")
    .select(
      "id, user_id, availability_date, status, is_all_day, start_time, end_time, note, updated_by, version, updated_at, profile:profiles!schedule_availability_user_id_fkey(display_name), updater:profiles!schedule_availability_updated_by_fkey(display_name)",
    )
    .order("availability_date")
    .order("user_id");

  if (error) throw new Error(`参加可能時間の取得に失敗しました: ${error.message}`);
  return ((data ?? []) as unknown as AvailabilityRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.profile?.display_name ?? "不明",
    availabilityDate: row.availability_date,
    status: row.status,
    isAllDay: row.is_all_day,
    startTime: row.start_time,
    endTime: row.end_time,
    note: row.note,
    updatedBy: row.updated_by,
    updaterName: row.updater?.display_name ?? "不明",
    version: row.version,
    updatedAt: row.updated_at,
  }));
}

export async function listScheduleProfiles(): Promise<ScheduleProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("is_active", true)
    .order("display_name");

  if (error) throw new Error(`メンバーの取得に失敗しました: ${error.message}`);
  return sortScheduleProfiles(
    ((data ?? []) as ProfileRow[]).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      role: row.role,
    })),
  );
}

function eventRpcParams(input: ScheduleEventInput) {
  return {
    p_title: input.title,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_is_all_day: input.isAllDay,
    p_time_tbd: input.timeTbd,
    p_time_note: input.timeNote,
    p_category: input.category,
    p_status: input.status,
    p_location: input.location,
    p_assignee_text: input.assigneeText,
    p_description: input.description,
    p_confirmation_note: input.confirmationNote,
    p_google_maps_url: input.googleMapsUrl,
    p_related_url: input.relatedUrl,
  };
}

function mutationResult(
  error: { message: string } | null,
  successMessage: string,
  failureLabel: string,
) {
  if (!error) return { ok: true as const, message: successMessage };
  const conflict = error.message.includes("conflict");
  return {
    ok: false as const,
    message: conflict
      ? "別の人が先に更新しました。画面を再読み込みしてください。"
      : `${failureLabel}できませんでした: ${error.message}`,
  };
}

export async function createScheduleEvent(
  supabase: SupabaseClient,
  input: ScheduleEventInput,
) {
  const { error } = await supabase.rpc("create_schedule_event", eventRpcParams(input));
  return mutationResult(error, "予定を登録しました。", "予定を登録");
}

export async function updateScheduleEvent(
  supabase: SupabaseClient,
  eventId: string,
  expectedVersion: number,
  input: ScheduleEventInput,
) {
  const { error } = await supabase.rpc("update_schedule_event", {
    p_event_id: eventId,
    p_expected_version: expectedVersion,
    ...eventRpcParams(input),
  });
  return mutationResult(error, "予定を更新しました。", "予定を更新");
}

export async function deleteScheduleEvent(
  supabase: SupabaseClient,
  eventId: string,
  expectedVersion: number,
) {
  const { error } = await supabase.rpc("delete_schedule_event", {
    p_event_id: eventId,
    p_expected_version: expectedVersion,
  });
  return mutationResult(error, "予定を削除しました。", "予定を削除");
}

export async function upsertScheduleAvailability(
  supabase: SupabaseClient,
  input: AvailabilityInput,
) {
  const { error } = await supabase.rpc("upsert_schedule_availability", {
    p_availability_id: input.availabilityId,
    p_expected_version: input.expectedVersion,
    p_user_id: input.userId,
    p_availability_date: input.availabilityDate,
    p_status: input.status,
    p_is_all_day: input.isAllDay,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_note: input.note,
  });
  return mutationResult(error, "参加可能時間を保存しました。", "参加可能時間を保存");
}
