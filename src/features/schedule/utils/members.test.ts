import assert from "node:assert/strict";
import { test } from "node:test";
import type { ScheduleProfile } from "@/features/schedule/types/schedule";
import {
  scheduleMemberLabel,
  sortScheduleProfiles,
} from "@/features/schedule/utils/members";

test("スケジュールのメンバーを指定順の名字表示にする", () => {
  const profiles: ScheduleProfile[] = [
    { id: "4", displayName: "内田 東陽", role: "admin" },
    { id: "2", displayName: "北川 太郎", role: "worker" },
    { id: "1", displayName: "山本ゆうへい", role: "worker" },
    { id: "3", displayName: "藤井 花子", role: "worker" },
  ];

  assert.deepEqual(
    sortScheduleProfiles(profiles).map((profile) =>
      scheduleMemberLabel(profile.displayName),
    ),
    ["山本", "北川", "藤井", "内田"],
  );
});

test("未登録の名字は元の表示名を維持して末尾へ並べる", () => {
  const profiles: ScheduleProfile[] = [
    { id: "5", displayName: "新規メンバー", role: "worker" },
    { id: "1", displayName: "山本ゆうへい", role: "worker" },
  ];

  const sorted = sortScheduleProfiles(profiles);
  assert.equal(sorted[1]?.displayName, "新規メンバー");
  assert.equal(scheduleMemberLabel("新規メンバー"), "新規メンバー");
});
