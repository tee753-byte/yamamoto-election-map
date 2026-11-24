import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が必要です`);
  return value;
}

const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function localClient() {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function signIn(email: string, password: string) {
  const client = localClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `${email} でログインできること`);
  return client;
}

test("RLS・役割・競合防止・二重送信防止が機能する", async () => {
  const assignedPosterId = "e0000000-0000-0000-0000-000000000003";
  const unassignedPosterId = "e0000000-0000-0000-0000-000000000005";
  const assignedPostingAreaId = "f0000000-0000-0000-0000-000000000002";
  const unassignedPostingAreaId = "f0000000-0000-0000-0000-000000000004";

  const anonymous = localClient();
  const anonymousRead = await anonymous.from("poster_boards").select("id");
  assert.ok(
    anonymousRead.error || anonymousRead.data?.length === 0,
    "非ログイン利用者は掲示場を取得できないこと",
  );

  const viewer = await signIn("viewer@yamamoto-map.local", "demo-viewer-2026");
  const initialPoster = await viewer
    .from("candidate_poster_work")
    .select("version")
    .eq("id", assignedPosterId)
    .single();
  assert.equal(initialPoster.error, null);
  assert.ok(initialPoster.data);
  const initialPosterVersion = initialPoster.data.version;

  const viewerUpdate = await viewer.rpc("update_poster_work", {
    p_work_id: assignedPosterId,
    p_expected_version: initialPosterVersion,
    p_new_status: "completed",
    p_note: "",
  });
  assert.match(viewerUpdate.error?.message ?? "", /not authorized/);

  const worker = await signIn("worker@yamamoto-map.local", "demo-worker-2026");

  const initialUnassigned = await worker
    .from("candidate_poster_work")
    .select("version")
    .eq("id", unassignedPosterId)
    .single();
  assert.equal(initialUnassigned.error, null);
  assert.ok(initialUnassigned.data);

  const directUpdate = await worker
    .from("candidate_poster_work")
    .update({ status: "completed" })
    .eq("id", unassignedPosterId)
    .select("id");
  assert.equal(directUpdate.error, null);
  assert.equal(
    directUpdate.data?.length,
    0,
    "作業担当者の直接更新はRLSで遮断されること",
  );
  const afterDirectUpdate = await worker
    .from("candidate_poster_work")
    .select("version")
    .eq("id", unassignedPosterId)
    .single();
  assert.equal(afterDirectUpdate.data?.version, initialUnassigned.data.version);

  const workerUpdate = await worker.rpc("update_poster_work", {
    p_work_id: assignedPosterId,
    p_expected_version: initialPosterVersion,
    p_new_status: "completed",
    p_note: "テスト更新",
  });
  assert.equal(workerUpdate.error, null, "割当済み掲示場は更新できること");

  const staleUpdate = await worker.rpc("update_poster_work", {
    p_work_id: assignedPosterId,
    p_expected_version: initialPosterVersion,
    p_new_status: "needs_review",
    p_note: "競合テスト",
  });
  assert.match(staleUpdate.error?.message ?? "", /conflict/);

  const unassignedUpdate = await worker.rpc("update_poster_work", {
    p_work_id: unassignedPosterId,
    p_expected_version: initialUnassigned.data.version,
    p_new_status: "completed",
    p_note: "",
  });
  assert.match(unassignedUpdate.error?.message ?? "", /not assigned/);

  const workerAssignment = await worker.rpc("assign_poster_work", {
    p_work_id: unassignedPosterId,
    p_expected_version: initialUnassigned.data.version,
    p_assignee_label: "任意担当",
  });
  assert.match(
    workerAssignment.error?.message ?? "",
    /not authorized/,
    "作業担当者は担当変更できないこと",
  );

  const initialPostingArea = await worker
    .from("posting_areas")
    .select("delivered_count, version")
    .eq("id", assignedPostingAreaId)
    .single();
  assert.equal(initialPostingArea.error, null);
  assert.ok(initialPostingArea.data);

  const requestId = crypto.randomUUID();
  const postingUpdate = await worker.rpc("record_posting_progress", {
    p_area_id: assignedPostingAreaId,
    p_expected_version: initialPostingArea.data.version,
    p_new_status: "assigned",
    p_delivered_increment: 7,
    p_request_id: requestId,
    p_note: "二重送信テスト",
  });
  assert.equal(postingUpdate.error, null);

  const duplicatePostingUpdate = await worker.rpc("record_posting_progress", {
    p_area_id: assignedPostingAreaId,
    p_expected_version: initialPostingArea.data.version,
    p_new_status: "assigned",
    p_delivered_increment: 7,
    p_request_id: requestId,
    p_note: "二重送信テスト",
  });
  assert.equal(
    duplicatePostingUpdate.error,
    null,
    "同じ操作の再送は成功扱いになること",
  );

  const postingArea = await worker
    .from("posting_areas")
    .select("delivered_count, version")
    .eq("id", assignedPostingAreaId)
    .single();
  assert.equal(postingArea.error, null);
  assert.equal(
    postingArea.data?.delivered_count,
    initialPostingArea.data.delivered_count + 7,
    "配布数が一度だけ加算されること",
  );
  assert.equal(
    postingArea.data?.version,
    initialPostingArea.data.version + 1,
    "版番号が一度だけ増えること",
  );

  const admin = await signIn("admin@yamamoto-map.local", "demo-admin-2026");

  const posterBeforeAssignment = await admin
    .from("candidate_poster_work")
    .select("version")
    .eq("id", unassignedPosterId)
    .single();
  assert.equal(posterBeforeAssignment.error, null);
  assert.ok(posterBeforeAssignment.data);

  const posterAssignment = await admin.rpc("assign_poster_work", {
    p_work_id: unassignedPosterId,
    p_expected_version: posterBeforeAssignment.data.version,
    p_assignee_label: "藤井・北川チーム",
  });
  assert.equal(posterAssignment.error, null, "管理者は掲示場の担当を変更できること");

  const assignedPoster = await admin
    .from("candidate_poster_work")
    .select("assignee_id, assignee_label, status, version")
    .eq("id", unassignedPosterId)
    .single();
  assert.equal(assignedPoster.error, null);
  assert.equal(assignedPoster.data?.assignee_id, null);
  assert.equal(assignedPoster.data?.assignee_label, "藤井・北川チーム");
  assert.equal(assignedPoster.data?.status, "assigned");

  const freeLabelPosterUpdate = await worker.rpc("update_poster_work", {
    p_work_id: unassignedPosterId,
    p_expected_version: assignedPoster.data?.version,
    p_new_status: "completed",
    p_note: "自由入力担当の更新テスト",
  });
  assert.equal(
    freeLabelPosterUpdate.error,
    null,
    "自由入力の担当作業は作業担当者が更新できること",
  );

  const posterAfterWorkerUpdate = await admin
    .from("candidate_poster_work")
    .select("version")
    .eq("id", unassignedPosterId)
    .single();
  assert.equal(posterAfterWorkerUpdate.error, null);
  assert.ok(posterAfterWorkerUpdate.data);

  const postingAreaBeforeAssignment = await admin
    .from("posting_areas")
    .select("version")
    .eq("id", unassignedPostingAreaId)
    .single();
  assert.equal(postingAreaBeforeAssignment.error, null);
  assert.ok(postingAreaBeforeAssignment.data);

  const postingAreaAssignment = await admin.rpc("assign_posting_area", {
    p_area_id: unassignedPostingAreaId,
    p_expected_version: postingAreaBeforeAssignment.data.version,
    p_assignee_label: "A班",
  });
  assert.equal(
    postingAreaAssignment.error,
    null,
    "管理者は配布区域の担当を変更できること",
  );

  const assignedPostingArea = await admin
    .from("posting_areas")
    .select("assignee_id, assignee_label, status, version")
    .eq("id", unassignedPostingAreaId)
    .single();
  assert.equal(assignedPostingArea.error, null);
  assert.equal(assignedPostingArea.data?.assignee_id, null);
  assert.equal(assignedPostingArea.data?.assignee_label, "A班");
  assert.equal(assignedPostingArea.data?.status, "assigned");

  const freeLabelPostingUpdate = await worker.rpc("record_posting_progress", {
    p_area_id: unassignedPostingAreaId,
    p_expected_version: assignedPostingArea.data?.version,
    p_new_status: "assigned",
    p_delivered_increment: 1,
    p_request_id: crypto.randomUUID(),
    p_note: "自由入力担当の更新テスト",
  });
  assert.equal(
    freeLabelPostingUpdate.error,
    null,
    "自由入力の担当区域は作業担当者が更新できること",
  );

  const postingAreaAfterWorkerUpdate = await admin
    .from("posting_areas")
    .select("version")
    .eq("id", unassignedPostingAreaId)
    .single();
  assert.equal(postingAreaAfterWorkerUpdate.error, null);
  assert.ok(postingAreaAfterWorkerUpdate.data);

  const auditLogs = await admin.from("audit_logs").select("id", { count: "exact" });
  assert.equal(auditLogs.error, null);
  assert.ok((auditLogs.count ?? 0) >= 4, "正常な更新が操作履歴に残ること");

  const posterUnassignment = await admin.rpc("assign_poster_work", {
    p_work_id: unassignedPosterId,
    p_expected_version: posterAfterWorkerUpdate.data.version,
    p_assignee_label: "",
  });
  assert.equal(posterUnassignment.error, null, "掲示場を未割当に戻せること");

  const postingAreaUnassignment = await admin.rpc("assign_posting_area", {
    p_area_id: unassignedPostingAreaId,
    p_expected_version: postingAreaAfterWorkerUpdate.data.version,
    p_assignee_label: "",
  });
  assert.equal(postingAreaUnassignment.error, null, "配布区域を未割当に戻せること");

  await Promise.all([
    viewer.auth.signOut(),
    worker.auth.signOut(),
    admin.auth.signOut(),
  ]);
});
