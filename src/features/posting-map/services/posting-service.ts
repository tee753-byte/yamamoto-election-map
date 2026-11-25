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
  assignee_label: string | null;
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
      "id, area_code, name, geometry, status, assignee_id, assignee_label, target_count, delivered_count, note, version, is_sample, profiles(id, display_name)",
    )
    .is("archived_at", null)
    .order("area_code");

  if (error) throw new Error(`配布区域の取得に失敗しました: ${error.message}`);

  return ((data ?? []) as unknown as PostingAreaRow[]).map((row) => ({
    id: row.id,
    areaCode: row.area_code,
    name: row.name,
    geometry: row.geometry,
    status: row.status,
    assigneeId: row.assignee_id,
    assigneeLabel: row.assignee_label,
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

interface AssignPostingAreaInput {
  areaId: string;
  expectedVersion: number;
  assigneeLabel: string;
  currentUserRole: UserRole;
}

interface ArchivePostingAreaInput {
  areaId: string;
  expectedVersion: number;
  currentUserRole: UserRole;
}

interface CreatePostingAreaInput {
  areaCode: string;
  name: string;
  geometry: GeoJsonPolygon;
  targetCount: number | null;
  note: string | null;
  requestId: string;
  currentUserRole: UserRole;
}

export type PostingAreaImportInput = Omit<
  CreatePostingAreaInput,
  "requestId" | "currentUserRole"
>;

export async function createPostingArea(
  supabase: SupabaseClient,
  input: CreatePostingAreaInput,
) {
  if (input.currentUserRole !== "admin") {
    return { ok: false, message: "区域を登録できるのは管理者だけです。" };
  }

  const { error } = await supabase.rpc("create_posting_area", {
    p_area_code: input.areaCode,
    p_name: input.name,
    p_geometry: input.geometry,
    p_target_count: input.targetCount,
    p_note: input.note,
    p_request_id: input.requestId,
  });

  if (error) {
    const duplicate = error.message.includes("posting_areas_area_code_key");
    const noPlan = error.message.includes("active posting plan not found");
    return {
      ok: false,
      message: duplicate
        ? "同じ区域番号がすでにあります。別の番号を入力してください。"
        : noPlan
          ? "有効なポスティング活動が設定されていません。"
          : `区域を登録できませんでした: ${error.message}`,
    };
  }

  return { ok: true, message: "配布区域を登録しました。" };
}

export async function importPostingAreas(
  supabase: SupabaseClient,
  areas: PostingAreaImportInput[],
  currentUserRole: UserRole,
) {
  if (currentUserRole !== "admin") {
    return { ok: false, message: "区域を一括登録できるのは管理者だけです。" };
  }

  const { data, error } = await supabase.rpc("import_posting_areas", {
    p_areas: areas,
  });
  if (error) {
    const duplicate = error.message.includes("posting_areas_area_code_key");
    return {
      ok: false,
      message: duplicate
        ? "同じ区域番号が含まれています。ファイルの区域番号をご確認ください。"
        : `区域を一括登録できませんでした: ${error.message}`,
    };
  }

  return { ok: true, message: `${Number(data)}区域を一括登録しました。` };
}

export async function assignPostingArea(
  supabase: SupabaseClient,
  input: AssignPostingAreaInput,
) {
  if (input.currentUserRole !== "admin") {
    return { ok: false, message: "担当者を変更できるのは管理者だけです。" };
  }

  const { error } = await supabase.rpc("assign_posting_area", {
    p_area_id: input.areaId,
    p_expected_version: input.expectedVersion,
    p_assignee_label: input.assigneeLabel,
  });

  if (error) {
    const conflict = error.message.includes("conflict");
    return {
      ok: false,
      message: conflict
        ? "別の人が先に更新しました。画面を再読み込みしてください。"
        : `担当者を変更できませんでした: ${error.message}`,
    };
  }

  return { ok: true, message: "担当者を変更しました。" };
}

export async function archivePostingArea(
  supabase: SupabaseClient,
  input: ArchivePostingAreaInput,
) {
  if (input.currentUserRole !== "admin") {
    return { ok: false, message: "区域を削除できるのは管理者だけです。" };
  }

  const { error } = await supabase.rpc("archive_posting_area", {
    p_area_id: input.areaId,
    p_expected_version: input.expectedVersion,
  });

  if (error) {
    const conflict = error.message.includes("conflict");
    return {
      ok: false,
      message: conflict
        ? "別の人が先に更新しました。画面を再読み込みしてください。"
        : `区域を削除できませんでした: ${error.message}`,
    };
  }

  return { ok: true, message: "配布区域を削除しました。" };
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
