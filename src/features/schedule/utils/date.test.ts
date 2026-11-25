import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  addMonths,
  isDateWithin,
  monthDays,
  todayInTokyo,
} from "@/features/schedule/utils/date";

test("日付だけの値をタイムゾーンでずらさず計算する", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(monthDays("2026-12").length, 42);
});

test("複数日の予定に指定日が含まれるか判定する", () => {
  assert.equal(isDateWithin("2026-12-23", "2026-12-20", "2026-12-26"), true);
  assert.equal(isDateWithin("2026-12-27", "2026-12-20", "2026-12-26"), false);
});

test("日本時間の日付を取得する", () => {
  assert.equal(todayInTokyo(new Date("2026-12-19T15:30:00Z")), "2026-12-20");
});
