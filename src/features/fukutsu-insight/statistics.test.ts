import assert from "node:assert/strict";
import test from "node:test";
import boundaries from "@/features/fukutsu-insight/data/boundaries.json";
import census from "@/features/fukutsu-insight/data/census-2020.json";
import statistics from "@/features/fukutsu-insight/data/statistics.json";

test("福津インサイトの公開統計データが統合されている", () => {
  assert.equal(statistics.dataKind, "実データ");
  assert.ok(statistics.latestRegional.towns.length > 0);
  assert.ok(statistics.trend.length > 0);
  assert.ok(statistics.sources.length > 0);
  assert.ok(census.areas.length > 0);
  assert.ok(boundaries.features.length > 0);
});

test("統計データの出典には参照先と利用条件がある", () => {
  for (const source of [...statistics.sources, ...census.sources]) {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.license.length > 0);
  }
});
