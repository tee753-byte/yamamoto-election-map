import assert from "node:assert/strict";
import test from "node:test";
import { calculateProgress } from "./progress";

test("状態別件数と完了率を計算する", () => {
  const result = calculateProgress([
    "not_started",
    "assigned",
    "completed",
    "completed",
    "needs_review",
  ]);

  assert.equal(result.total, 5);
  assert.equal(result.completed, 2);
  assert.equal(result.percent, 40);
  assert.deepEqual(result.counts, {
    not_started: 1,
    assigned: 1,
    completed: 2,
    needs_review: 1,
  });
});

test("対象が0件なら進捗率を0にする", () => {
  assert.equal(calculateProgress([]).percent, 0);
});
