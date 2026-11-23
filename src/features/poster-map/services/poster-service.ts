import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Candidate, PosterWork, UserRole, WorkStatus } from "@/lib/types/domain";

interface CandidateRow {
  id: string;
  display_name: string;
  color: string;
  is_active: boolean;
}

interface PosterWorkRow {
  id: string;
  candidate_id: string;
  poster_board_id: string;
  status: WorkStatus;
  assignee_id: string | null;
  note: string | null;
  version: number;
  poster_boards: {
    id: string;
    board_number: string;
    latitude: number;
    longitude: number;
    location_hint: string;
    is_sample: boolean;
  };
  profiles: { id: string; display_name: string } | null;
}

export async function listCandidates(): Promise<Candidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, display_name, color, is_active")
    .eq("is_active", true)
    .order("display_name");

  if (error) throw new Error(`候補者の取得に失敗しました: ${error.message}`);

  return ((data ?? []) as CandidateRow[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    color: row.color,
    isActive: row.is_active,
  }));
}

export async function listPosterWork(candidateId: string): Promise<PosterWork[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidate_poster_work")
    .select(
      "id, candidate_id, poster_board_id, status, assignee_id, note, version, poster_boards!inner(id, board_number, latitude, longitude, location_hint, is_sample), profiles(id, display_name)",
    )
    .eq("candidate_id", candidateId)
    .order("poster_board_id");

  if (error) throw new Error(`掲示場の取得に失敗しました: ${error.message}`);

  return ((data ?? []) as unknown as PosterWorkRow[]).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    boardId: row.poster_board_id,
    status: row.status,
    assigneeId: row.assignee_id,
    note: row.note,
    version: row.version,
    board: {
      id: row.poster_boards.id,
      boardNumber: row.poster_boards.board_number,
      latitude: row.poster_boards.latitude,
      longitude: row.poster_boards.longitude,
      locationHint: row.poster_boards.location_hint,
      isSample: row.poster_boards.is_sample,
    },
    assignee: row.profiles
      ? { id: row.profiles.id, displayName: row.profiles.display_name }
      : null,
  }));
}

interface UpdatePosterWorkInput {
  workId: string;
  expectedVersion: number;
  status: WorkStatus;
  note: string | null;
  currentUserRole: UserRole;
}

export async function updatePosterWork(
  supabase: SupabaseClient,
  input: UpdatePosterWorkInput,
) {
  if (input.currentUserRole === "viewer") {
    return { ok: false, message: "閲覧のみの利用者は更新できません。" };
  }

  const { error } = await supabase.rpc("update_poster_work", {
    p_work_id: input.workId,
    p_expected_version: input.expectedVersion,
    p_new_status: input.status,
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

  return { ok: true, message: "掲示状況を更新しました。" };
}
