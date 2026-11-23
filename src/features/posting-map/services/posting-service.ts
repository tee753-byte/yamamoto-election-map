import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  GeoJsonPolygon,
  PostingArea,
  UserRole,
  WorkStatus,
} from "@/lib/types/domain";

interface PostingAreaRow {
  id: string;
  area_code: string;
  name: string;
  geometry: GeoJsonPolygon;
  status: WorkStatus;
  assignee_id: string | null;
  target_count: number | null;
  delivered_count: number;
  note: string | null;
  version: number;
  is_sample: boolean;
  profiles: { id: string; display_name: string } | null;
}

export async function listPostingAreas(): Promise<PostingArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posting_areas")
    .select(
      "id, area_code, name, geometry, status, assignee_id, target_count, delivered_count, note, version, is_sample, profiles(id, display_name)",
    )
    .order("area_code");

  if (error) throw new Error(`配布区域の取得に失敗しました: ${error.message}`);

  return ((data ?? []) as unknown as PostingAreaRow[]).map((row) => ({
    id: row.id,
    areaCode: row.area_code,
    name: row.name,
    geometry: row.geometry,
    status: row.status,
    assigneeId: row.assignee_id,
    targetCount: row.target_count,
    deliveredCount: row.delivered_count,
    note: row.note,
    version: row.version,
    isSample: row.is_sample,
    assignee: row.profiles
      ? { id: row.profiles.id, displayName: row.profiles.display_name }
      : null,
  }));
}

interface RecordPostingInput {
  areaId: string;
  expectedVersion: number;
  status: WorkStatus;
  deliveredIncrement: number;
  requestId: string;
  note: string | null;
  currentUserRole: UserRole;
}

export async function recordPostingProgress(
  supabase: SupabaseClient,
  input: RecordPostingInput,
) {
  if (input.currentUserRole === "viewer") {
    return { ok: false, message: "閲覧のみの利用者は更新できません。" };
  }

  const { error } = await supabase.rpc("record_posting_progress", {
    p_area_id: input.areaId,
    p_expected_version: input.expectedVersion,
    p_new_status: input.status,
    p_delivered_increment: input.deliveredIncrement,
    p_request_id: input.requestId,
    p_note: input.note,
  });

  if (error) {
    const conflict = error.message.includes("conflict");
    return {
      ok: false,
      message: conflict
        ? "別の人が先に更新しました。画面を再読み込みしてください。"
        : `更新できませんでした: ${error.message}`,
    };
  }

  return { ok: true, message: "配布状況を更新しました。" };
}
