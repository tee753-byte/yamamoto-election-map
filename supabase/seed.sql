-- このファイルの位置・番号・担当者・配布数は、すべてローカル試作用の架空データです。
-- 実際の掲示場や配布区域を示すものではありません。

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, email_change,
  email_change_token_new, recovery_token, confirmation_token,
  confirmation_sent_at, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'admin@yamamoto-map.local',
    extensions.crypt('demo-admin-2026', extensions.gen_salt('bf')),
    now(), now(), '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}', '', '', '', '', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'worker@yamamoto-map.local',
    extensions.crypt('demo-worker-2026', extensions.gen_salt('bf')),
    now(), now(), '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}', '', '', '', '', now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated', 'viewer@yamamoto-map.local',
    extensions.crypt('demo-viewer-2026', extensions.gen_salt('bf')),
    now(), now(), '{"provider":"email","providers":["email"]}',
    '{"email_verified":true}', '', '', '', '', now(), now(), now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, id,
  last_sign_in_at, created_at, updated_at
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@yamamoto-map.local"}',
    'email', 'a1000000-0000-0000-0000-000000000001', now(), now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '{"sub":"a0000000-0000-0000-0000-000000000002","email":"worker@yamamoto-map.local"}',
    'email', 'a1000000-0000-0000-0000-000000000002', now(), now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    '{"sub":"a0000000-0000-0000-0000-000000000003","email":"viewer@yamamoto-map.local"}',
    'email', 'a1000000-0000-0000-0000-000000000003', now(), now(), now()
  )
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, display_name, role)
values
  ('a0000000-0000-0000-0000-000000000001', '管理者（架空）', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', '作業担当A（架空）', 'worker'),
  ('a0000000-0000-0000-0000-000000000003', '閲覧担当（架空）', 'viewer')
on conflict (id) do nothing;

insert into public.candidates (id, display_name, color, is_active)
values (
  'c0000000-0000-0000-0000-000000000001',
  '山本ゆうへい',
  '#620000',
  true
)
on conflict (id) do nothing;

insert into public.activity_plans (
  id, activity_type, title, document_description, method_description,
  starts_at, ends_at, compliance_note, is_enabled
)
values (
  'd0000000-0000-0000-0000-000000000001',
  'posting',
  '告示前ポスティング（試作）',
  '配布文書は未確定。実運用前に適法性を確認する。',
  '徒歩で郵便受けへ投函する想定。試作設定。',
  '2026-11-01 00:00:00+09',
  '2026-12-19 23:59:59+09',
  'ローカル動作確認用。有効化は適法性の保証を意味しない。',
  true
)
on conflict (id) do nothing;

insert into public.poster_boards (
  id, board_number, latitude, longitude, location_hint, source_label, is_sample
)
values
  ('b0000000-0000-0000-0000-000000000001', 'F-001', 33.7635, 130.4864, '福間駅周辺の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000002', 'F-002', 33.7684, 130.4808, '中央地区の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000003', 'F-003', 33.7726, 130.4898, '福間北部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000004', 'F-004', 33.7578, 130.4921, '花見地区付近の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000005', 'F-005', 33.7509, 130.4855, '南部地区の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000006', 'F-006', 33.7651, 130.5017, '東福間方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000007', 'F-007', 33.7738, 130.5077, '若木台方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000008', 'F-008', 33.7817, 130.4930, '宮司地区の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000009', 'F-009', 33.7825, 130.4783, '宮地浜方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000010', 'F-010', 33.7892, 130.4697, '津屋崎南部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000011', 'F-011', 33.7958, 130.4635, '津屋崎中心部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000012', 'F-012', 33.8037, 130.4588, '津屋崎北部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000013', 'F-013', 33.8106, 130.4661, '勝浦南部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000014', 'F-014', 33.8182, 130.4748, '勝浦地区の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000015', 'F-015', 33.8084, 130.4897, '内陸北部の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000016', 'F-016', 33.7981, 130.4959, '上西郷方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000017', 'F-017', 33.7895, 130.5016, '内殿方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000018', 'F-018', 33.7810, 130.5144, '畦町方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000019', 'F-019', 33.7688, 130.5165, '久末方面の架空地点', '架空サンプル', true),
  ('b0000000-0000-0000-0000-000000000020', 'F-020', 33.7565, 130.5102, '手光方面の架空地点', '架空サンプル', true)
on conflict (id) do nothing;

insert into public.candidate_poster_work (
  id, candidate_id, poster_board_id, status, assignee_id, note
)
select
  ('e0000000-0000-0000-0000-' || lpad(row_number() over (order by board_number)::text, 12, '0'))::uuid,
  'c0000000-0000-0000-0000-000000000001'::uuid,
  id,
  case board_number
    when 'F-001' then 'completed'::public.work_status
    when 'F-002' then 'completed'::public.work_status
    when 'F-003' then 'assigned'::public.work_status
    when 'F-004' then 'needs_review'::public.work_status
    else 'not_started'::public.work_status
  end,
  case when board_number in ('F-001', 'F-002', 'F-003', 'F-004')
    then 'a0000000-0000-0000-0000-000000000002'::uuid
    else null
  end,
  case when board_number = 'F-004' then '位置を再確認する架空メモ' else null end
from public.poster_boards
on conflict (candidate_id, poster_board_id) do update set
  status = excluded.status,
  assignee_id = excluded.assignee_id,
  note = excluded.note;

insert into public.posting_areas (
  id, activity_plan_id, area_code, name, geometry, status, assignee_id,
  target_count, delivered_count, note, is_sample
)
values
  (
    'f0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'P-01', '福間駅周辺・架空区域',
    '{"type":"Polygon","coordinates":[[[130.478,33.758],[130.490,33.758],[130.490,33.768],[130.478,33.768],[130.478,33.758]]]}',
    'completed', 'a0000000-0000-0000-0000-000000000002', 500, 480,
    '試作用の配布数', true
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'P-02', '福間東部・架空区域',
    '{"type":"Polygon","coordinates":[[[130.493,33.758],[130.507,33.758],[130.507,33.770],[130.493,33.770],[130.493,33.758]]]}',
    'assigned', 'a0000000-0000-0000-0000-000000000002', 650, 210,
    null, true
  ),
  (
    'f0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'P-03', '宮司地区・架空区域',
    '{"type":"Polygon","coordinates":[[[130.477,33.773],[130.493,33.773],[130.493,33.785],[130.477,33.785],[130.477,33.773]]]}',
    'needs_review', 'a0000000-0000-0000-0000-000000000002', 420, 100,
    '区域境界を再確認する架空メモ', true
  ),
  (
    'f0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'P-04', '津屋崎南部・架空区域',
    '{"type":"Polygon","coordinates":[[[130.461,33.785],[130.478,33.785],[130.478,33.798],[130.461,33.798],[130.461,33.785]]]}',
    'not_started', null, 550, 0, null, true
  ),
  (
    'f0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'P-05', '津屋崎北部・架空区域',
    '{"type":"Polygon","coordinates":[[[130.453,33.799],[130.472,33.799],[130.472,33.812],[130.453,33.812],[130.453,33.799]]]}',
    'not_started', null, 380, 0, null, true
  ),
  (
    'f0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'P-06', '内陸北部・架空区域',
    '{"type":"Polygon","coordinates":[[[130.481,33.795],[130.503,33.795],[130.503,33.812],[130.481,33.812],[130.481,33.795]]]}',
    'not_started', null, 300, 0, null, true
  )
on conflict (id) do update set
  status = excluded.status,
  assignee_id = excluded.assignee_id,
  target_count = excluded.target_count,
  delivered_count = excluded.delivered_count,
  note = excluded.note;
