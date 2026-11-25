import assert from "node:assert/strict";
import test from "node:test";
import boundaries from "@/features/fukutsu-insight/data/boundaries.json";
import census from "@/features/fukutsu-insight/data/census-2020.json";
import statistics from "@/features/fukutsu-insight/data/statistics.json";
import { normalizeAreaName } from "@/features/fukutsu-insight/utils/area-name";

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

test("2020年地図の境界と検索用国勢調査データを地域コードで対応できる", () => {
  const censusByCode = new Map(census.areas.map((area) => [area.code, area]));
  const matchedFeatures = boundaries.features.filter((feature) =>
    censusByCode.has(feature.properties.areaCode),
  );

  assert.ok(matchedFeatures.length > 0);
  assert.equal(
    censusByCode.get("008005")?.population,
    359,
    "東福間五丁目は地図と検索結果で同じ2020年人口を使う",
  );
  assert.equal(censusByCode.get("008005")?.households, 151);
});

test("最新町丁目統計を2020年の地図境界へ名称で対応できる", () => {
  const latestByName = new Map(
    statistics.latestRegional.towns.map((area) => [normalizeAreaName(area.name), area]),
  );
  const matchedFeatures = boundaries.features.filter((feature) =>
    latestByName.has(normalizeAreaName(feature.properties.name)),
  );
  const eastFukuma5 = latestByName.get(normalizeAreaName("東福間五丁目"));

  assert.ok(matchedFeatures.length >= 100, "最新統計を100以上の境界形状へ対応できる");
  assert.equal(eastFukuma5?.population, 334);
  assert.equal(eastFukuma5?.households, 159);
});
