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
  assert.equal(
    assignedPostingArea.data?.status,
    "not_started",
    "担当を決めても進捗状態は未対応のまま維持されること",
  );

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

test("管理者だけが配布区域を作成・一括登録・削除できる", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const geometry = {
    type: "Polygon",
    coordinates: [
      [
        [130.48, 33.76],
        [130.481, 33.76],
        [130.481, 33.761],
        [130.48, 33.76],
      ],
    ],
  };
  const input = {
    p_area_code: `TEST-${suffix}`,
    p_name: "区域登録の統合テスト",
    p_geometry: geometry,
    p_target_count: 100,
    p_note: "個人情報を含まないテスト",
    p_request_id: crypto.randomUUID(),
  };

  const worker = await signIn("worker@yamamoto-map.local", "demo-worker-2026");
  const workerCreate = await worker.rpc("create_posting_area", input);
  assert.match(workerCreate.error?.message ?? "", /not authorized/);

  const admin = await signIn("admin@yamamoto-map.local", "demo-admin-2026");
  const invalidGeometry = await admin.rpc("create_posting_area", {
    ...input,
    p_area_code: `INVALID-${suffix}`,
    p_geometry: {
      type: "Polygon",
      coordinates: [
        [
          [130.48, 33.76],
          [130.481, 33.76],
          [130.481, 33.761],
        ],
      ],
    },
    p_request_id: crypto.randomUUID(),
  });
  assert.match(invalidGeometry.error?.message ?? "", /invalid polygon/);

  const adminCreate = await admin.rpc("create_posting_area", input);
  assert.equal(adminCreate.error, null, "管理者は地図区域を登録できること");
  const created = await admin
    .from("posting_areas")
    .select("area_code, name, target_count, is_sample, version")
    .eq("id", adminCreate.data)
    .single();
  assert.equal(created.error, null);
  assert.equal(created.data?.area_code, input.p_area_code);
  assert.equal(created.data?.target_count, 100);
  assert.equal(created.data?.is_sample, false);

  const workerEdit = await worker.rpc("update_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: created.data?.version,
    p_name: "作業担当者による変更",
    p_geometry: geometry,
    p_target_count: 200,
    p_note: "拒否される変更",
  });
  assert.match(workerEdit.error?.message ?? "", /not authorized/);

  const editedGeometry = {
    type: "Polygon",
    coordinates: [
      [
        [130.48, 33.76],
        [130.482, 33.76],
        [130.482, 33.762],
        [130.48, 33.76],
      ],
    ],
  };
  const adminEdit = await admin.rpc("update_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: created.data?.version,
    p_name: "区域登録の編集テスト",
    p_geometry: editedGeometry,
    p_target_count: 250,
    p_note: "編集後のメモ",
  });
  assert.equal(adminEdit.error, null, "管理者は区域情報と境界線を編集できること");

  const edited = await admin
    .from("posting_areas")
    .select("name, geometry, target_count, note, version")
    .eq("id", adminCreate.data)
    .single();
  assert.equal(edited.error, null);
  assert.equal(edited.data?.name, "区域登録の編集テスト");
  assert.equal(edited.data?.target_count, 250);
  assert.equal(edited.data?.note, "編集後のメモ");
  assert.deepEqual(edited.data?.geometry, editedGeometry);

  const staleEdit = await admin.rpc("update_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: created.data?.version,
    p_name: "競合する変更",
    p_geometry: geometry,
    p_target_count: null,
    p_note: null,
  });
  assert.match(staleEdit.error?.message ?? "", /conflict/);

  const workerArchive = await worker.rpc("archive_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: edited.data?.version,
  });
  assert.match(workerArchive.error?.message ?? "", /not authorized/);

  const staleArchive = await admin.rpc("archive_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: (edited.data?.version ?? 1) + 1,
  });
  assert.match(staleArchive.error?.message ?? "", /conflict/);

  const adminArchive = await admin.rpc("archive_posting_area", {
    p_area_id: adminCreate.data,
    p_expected_version: edited.data?.version,
  });
  assert.equal(adminArchive.error, null, "管理者は区域を削除できること");
  const archivedRead = await admin
    .from("posting_areas")
    .select("id")
    .eq("id", adminCreate.data)
    .is("archived_at", null);
  assert.equal(archivedRead.error, null);
  assert.equal(
    archivedRead.data?.length,
    0,
    "削除した区域は通常一覧に表示されないこと",
  );

  const archiveAudit = await admin
    .from("audit_logs")
    .select("id")
    .eq("entity_id", adminCreate.data)
    .eq("action", "archived");
  assert.equal(archiveAudit.error, null);
  assert.equal(archiveAudit.data?.length, 1, "区域削除が操作履歴に残ること");

  const importRows = [1, 2].map((number) => ({
    areaCode: `IMPORT-${suffix}-${number}`,
    name: `一括登録テスト${number}`,
    geometry,
    targetCount: number * 50,
    note: null,
    assigneeLabel: number === 1 ? "立石" : undefined,
  }));
  const imported = await admin.rpc("import_posting_areas", { p_areas: importRows });
  assert.equal(imported.error, null, "GeoJSON由来の区域を一括登録できること");
  assert.equal(imported.data, 2);

  const importedRows = await admin
    .from("posting_areas")
    .select("area_code, assignee_label, status")
    .in(
      "area_code",
      importRows.map((row) => row.areaCode),
    );
  assert.equal(importedRows.error, null);
  assert.equal(importedRows.data?.length, 2);
  const importedWithAssignee = importedRows.data?.find(
    (row) => row.area_code === importRows[0]?.areaCode,
  );
  assert.equal(importedWithAssignee?.assignee_label, "立石");
  assert.equal(
    importedWithAssignee?.status,
    "not_started",
    "一括登録で担当を設定しても未対応のままになること",
  );

  await Promise.all([worker.auth.signOut(), admin.auth.signOut()]);
});

test("スケジュールのRLS・削除権限・同時更新・参加可能時間が機能する", async () => {
  const workerId = "a0000000-0000-0000-0000-000000000002";
  const adminId = "a0000000-0000-0000-0000-000000000001";
  const offset = Date.now() % 3000;
  const date = new Date(Date.UTC(2040, 0, 1 + offset));
  const workerDate = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 1);
  const adminProxyDate = date.toISOString().slice(0, 10);

  const eventParams = (title: string, startDate: string) => ({
    p_title: title,
    p_start_date: startDate,
    p_end_date: null,
    p_start_time: "09:00",
    p_end_time: "10:00",
    p_is_all_day: false,
    p_time_tbd: false,
    p_time_note: null,
    p_category: "meeting",
    p_status: "tentative",
    p_location: null,
    p_assignee_text: null,
    p_description: "RLS統合テスト",
    p_confirmation_note: null,
    p_google_maps_url: null,
    p_related_url: null,
  });

  const anonymous = localClient();
  const anonymousRead = await anonymous.from("schedule_events").select("id");
  assert.ok(
    anonymousRead.error || anonymousRead.data?.length === 0,
    "非ログイン利用者は予定を取得できないこと",
  );

  const viewer = await signIn("viewer@yamamoto-map.local", "demo-viewer-2026");
  const viewerRead = await viewer.from("schedule_events").select("id");
  assert.equal(viewerRead.error, null, "ログイン済み閲覧者は予定を閲覧できること");
  const viewerCreate = await viewer.rpc("create_schedule_event", {
    ...eventParams(`閲覧者作成拒否-${crypto.randomUUID()}`, workerDate),
  });
  assert.match(viewerCreate.error?.message ?? "", /not authorized/);

  const worker = await signIn("worker@yamamoto-map.local", "demo-worker-2026");
  const directInsert = await worker.from("schedule_events").insert({
    title: "直接追加拒否",
    start_date: workerDate,
    created_by: workerId,
    updated_by: workerId,
  });
  assert.ok(directInsert.error, "テーブルへの直接追加は拒否されること");

  const workerCreate = await worker.rpc("create_schedule_event", {
    ...eventParams(`作業担当者の予定-${crypto.randomUUID()}`, workerDate),
  });
  assert.equal(workerCreate.error, null, "作業担当者は予定を登録できること");
  const workerEventId = workerCreate.data as string;

  const workerUpdate = await worker.rpc("update_schedule_event", {
    p_event_id: workerEventId,
    p_expected_version: 1,
    ...eventParams("更新した予定", workerDate),
  });
  assert.equal(workerUpdate.error, null, "作業担当者は予定を編集できること");

  const staleUpdate = await worker.rpc("update_schedule_event", {
    p_event_id: workerEventId,
    p_expected_version: 1,
    ...eventParams("競合する更新", workerDate),
  });
  assert.match(staleUpdate.error?.message ?? "", /conflict/);

  const admin = await signIn("admin@yamamoto-map.local", "demo-admin-2026");
  const adminCreate = await admin.rpc("create_schedule_event", {
    ...eventParams(`管理者の予定-${crypto.randomUUID()}`, adminProxyDate),
  });
  assert.equal(adminCreate.error, null);
  const adminEventId = adminCreate.data as string;

  const workerDeletesOthers = await worker.rpc("delete_schedule_event", {
    p_event_id: adminEventId,
    p_expected_version: 1,
  });
  assert.match(workerDeletesOthers.error?.message ?? "", /not authorized to delete/);

  const selfAvailability = await worker.rpc("upsert_schedule_availability", {
    p_availability_id: null,
    p_expected_version: null,
    p_user_id: workerId,
    p_availability_date: workerDate,
    p_status: "available",
    p_is_all_day: false,
    p_start_time: "09:00",
    p_end_time: "17:00",
    p_note: "統合テスト",
  });
  assert.equal(selfAvailability.error, null, "本人は参加可能時間を登録できること");
  const selfAvailabilityId = selfAvailability.data as string;

  const anotherAvailability = await worker.rpc("upsert_schedule_availability", {
    p_availability_id: null,
    p_expected_version: null,
    p_user_id: adminId,
    p_availability_date: workerDate,
    p_status: "available",
    p_is_all_day: true,
    p_start_time: null,
    p_end_time: null,
    p_note: null,
  });
  assert.match(
    anotherAvailability.error?.message ?? "",
    /not authorized for another user/,
  );

  const adminProxy = await admin.rpc("upsert_schedule_availability", {
    p_availability_id: null,
    p_expected_version: null,
    p_user_id: workerId,
    p_availability_date: adminProxyDate,
    p_status: "undecided",
    p_is_all_day: false,
    p_start_time: null,
    p_end_time: null,
    p_note: "管理者代理登録テスト",
  });
  assert.equal(adminProxy.error, null, "管理者は代理登録できること");
  const adminProxyId = adminProxy.data as string;

  const workerDeleteOwnAvailability = await worker.rpc("delete_schedule_availability", {
    p_availability_id: selfAvailabilityId,
    p_expected_version: 1,
  });
  assert.equal(
    workerDeleteOwnAvailability.error,
    null,
    "本人は自分の参加可能情報を未回答へ戻せること",
  );

  const adminDeleteProxyAvailability = await admin.rpc("delete_schedule_availability", {
    p_availability_id: adminProxyId,
    p_expected_version: 1,
  });
  assert.equal(
    adminDeleteProxyAvailability.error,
    null,
    "管理者は代理登録した参加可能情報を削除できること",
  );

  const workerDeleteOwn = await worker.rpc("delete_schedule_event", {
    p_event_id: workerEventId,
    p_expected_version: 2,
  });
  assert.equal(workerDeleteOwn.error, null, "作業担当者は自分の予定を削除できること");

  const adminDeleteAny = await admin.rpc("delete_schedule_event", {
    p_event_id: adminEventId,
    p_expected_version: 1,
  });
  assert.equal(adminDeleteAny.error, null, "管理者はすべての予定を削除できること");

  await Promise.all([
    viewer.auth.signOut(),
    worker.auth.signOut(),
    admin.auth.signOut(),
  ]);
});
