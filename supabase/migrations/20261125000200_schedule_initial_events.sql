-- 2026年福津市議会議員選挙に向け、運営メンバーから共有された初期予定。
-- 未確定事項は tentative / needs_review として登録し、確定情報とは区別する。
do $$
declare
  v_actor uuid;
begin
  select p.id into v_actor
  from public.profiles p
  where p.role = 'admin' and p.is_active = true
  order by p.created_at
  limit 1;

  if v_actor is null then
    raise notice '初期予定を登録できる有効な管理者がいないため、予定投入をスキップします。';
  else
    with saved_events as (
      insert into public.schedule_events (
        id, title, start_date, end_date, start_time, end_time, is_all_day, time_tbd,
        time_note, category, status, location, assignee_text, description,
        confirmation_note, created_by, updated_by
      )
      values
        (
          '53000000-0000-0000-0000-000000000001',
          'ポスター掲示場等の公表予定（選管）',
          '2026-12-07', null, null, null, false, true, null,
          'important', 'tentative', null, null,
          '公表後にポスター貼りの班分けを確定する予定。',
          '公表内容、掲示場番号、位置を確認する。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000002',
          '事前チェック',
          '2026-12-09', null, '09:00', null, false, false, null,
          'meeting', 'needs_review', null, null,
          '内容・場所・参加者を確認する。',
          '内容、場所、参加者は要確認。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000003',
          '選挙公報の原稿完成目安',
          '2026-12-09', null, null, null, true, false, '締切',
          'deadline', 'needs_review', null, null,
          '事前チェックで確認してもらう想定。',
          '内容は山本さんの判断待ち。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000004',
          'オープンチャット等の説明会',
          '2026-12-19', null, null, null, false, true, null,
          'meeting', 'needs_review', null, null,
          'オープンチャット等での説明会を予定。',
          '時間、場所、対象者は未定。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000005',
          '立候補届出',
          '2026-12-20', null, '08:30', null, false, false, null,
          'important', 'confirmed', null, '内田（届出担当）',
          null, null,
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000006',
          'ポスター貼り',
          '2026-12-20', null, null, null, false, true, '届出受理後',
          'work', 'tentative', null, null,
          '5班×20枚の想定。',
          '正確な開始時刻と班分けは未確定。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000007',
          'チラシの証紙貼り',
          '2026-12-20', null, null, null, false, true, 'ポスター組の帰着後',
          'work', 'tentative', null, null,
          '4,000枚の想定。',
          '開始時刻と参加者は未確定。',
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000008',
          '選挙期間',
          '2026-12-20', '2026-12-26', null, null, true, false, null,
          'important', 'confirmed', null, null,
          '動画編集はほなみさんへ依頼する方針。',
          null,
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000009',
          '選挙運動最終日',
          '2026-12-26', null, null, null, true, false, null,
          'important', 'confirmed', null, null,
          null, null,
          v_actor, v_actor
        ),
        (
          '53000000-0000-0000-0000-000000000010',
          '投票日',
          '2026-12-27', null, null, null, true, false, null,
          'important', 'confirmed', null, '北川（開票立会人）',
          '開票立会人：北川', null,
          v_actor, v_actor
        )
      on conflict (id) do update set
        title = excluded.title,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        is_all_day = excluded.is_all_day,
        time_tbd = excluded.time_tbd,
        time_note = excluded.time_note,
        category = excluded.category,
        status = excluded.status,
        location = excluded.location,
        assignee_text = excluded.assignee_text,
        description = excluded.description,
        confirmation_note = excluded.confirmation_note,
        updated_by = excluded.updated_by,
        version = public.schedule_events.version + 1
      returning *
    )
    insert into public.audit_logs (
      actor_id, entity_type, entity_id, action, after_data
    )
    select
      v_actor, 'schedule_event', e.id, 'created', to_jsonb(e)
    from saved_events e;
  end if;
end;
$$;
