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
  const auditLogs = await admin.from("audit_logs").select("id", { count: "exact" });
  assert.equal(auditLogs.error, null);
  assert.ok((auditLogs.count ?? 0) >= 2, "正常な更新が操作履歴に残ること");

  await Promise.all([
    viewer.auth.signOut(),
    worker.auth.signOut(),
    admin.auth.signOut(),
  ]);
});
