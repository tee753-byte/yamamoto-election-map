"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type L from "leaflet";
import { Info, Layers3, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BoundaryProperties,
  CensusArea,
  CensusData,
  StatisticsData,
} from "@/features/fukutsu-insight/types/statistics";
import { formatDate, formatNumber } from "@/features/fukutsu-insight/utils/format";
import styles from "./insight.module.css";

const COMMUNITY_AREAS = [
  ["福間", 18224, 8324, 23.84],
  ["福間南", 16442, 6856, 21.44],
  ["上西郷", 2711, 1280, 37.88],
  ["神興", 6483, 3294, 42.03],
  ["神興東", 7519, 3273, 32],
  ["勝浦", 1004, 507, 44.52],
  ["津屋崎", 8736, 3944, 26.95],
  ["宮司", 8675, 3976, 25.18],
] as const;

type ViewMode = "boundary" | "community";
type Indicator = "population" | "households" | "agingRate";
const COLORS = ["#f5e9eb", "#e8cdd2", "#d8a6af", "#b96675", "#862d39"];
const INDICATORS: Record<
  Indicator,
  { label: string; unit: string; thresholds: number[] }
> = {
  population: { label: "人口", unit: "人", thresholds: [300, 700, 1200, 2000] },
  households: { label: "世帯数", unit: "世帯", thresholds: [150, 300, 500, 800] },
  agingRate: { label: "高齢化率", unit: "%", thresholds: [20, 30, 40, 50] },
};

function getValue(area: CensusArea | undefined, indicator: Indicator) {
  return area?.[indicator] ?? null;
}

function getColor(area: CensusArea | undefined, indicator: Indicator) {
  const value = getValue(area, indicator);
  if (value === null) return "#d5d9dd";
  const index = INDICATORS[indicator].thresholds.findIndex(
    (threshold) => value < threshold,
  );
  return COLORS[index === -1 ? COLORS.length - 1 : index];
}

function formatIndicatorValue(area: CensusArea, indicator: Indicator) {
  const value = getValue(area, indicator);
  if (value === null) return "データなし";
  if (indicator === "agingRate") return `${value.toFixed(2)}%`;
  return `${formatNumber(value)}${INDICATORS[indicator].unit}`;
}

export function StatisticsMap({ data }: { data: StatisticsData }) {
  const containerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const [boundaries, setBoundaries] =
    useState<FeatureCollection<Geometry, BoundaryProperties>>();
  const [census, setCensus] = useState<CensusData>();
  const [error, setError] = useState("");
  const [selected, setSelected] =
    useState<Pick<BoundaryProperties, "areaCode" | "name">>();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("community");
  const [indicator, setIndicator] = useState<Indicator>("population");

  useEffect(() => {
    Promise.all([
      fetch("/api/insight/boundaries").then((response) => {
        if (!response.ok) throw new Error("境界データを読み込めませんでした。");
        return response.json() as Promise<
          FeatureCollection<Geometry, BoundaryProperties>
        >;
      }),
      fetch("/api/insight/census").then((response) => {
        if (!response.ok) throw new Error("国勢調査データを読み込めませんでした。");
        return response.json() as Promise<CensusData>;
      }),
    ])
      .then(([boundaryData, censusData]) => {
        setBoundaries(boundaryData);
        setCensus(censusData);
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "地図データの読み込みに失敗しました。",
        );
      });
  }, []);

  const censusByCode = useMemo(
    () => new Map(census?.areas.map((area) => [area.code, area]) ?? []),
    [census],
  );
  const selectedArea = selected ? censusByCode.get(selected.areaCode) : undefined;
  const boundaryAreas = useMemo(() => {
    const boundaryCodes = new Set(
      boundaries?.features.map((feature) => feature.properties.areaCode) ?? [],
    );
    return census?.areas.filter((area) => boundaryCodes.has(area.code)) ?? [];
  }, [boundaries, census]);
  const filteredAreas = useMemo(
    () => boundaryAreas.filter((area) => area.name.includes(query.trim())).slice(0, 12),
    [boundaryAreas, query],
  );

  useEffect(() => {
    if (mode === "boundary") return;
    mapRef.current?.remove();
    mapRef.current = null;
    layerRef.current = null;
  }, [mode]);

  useEffect(() => {
    if (mode !== "boundary" || !containerRef.current || !boundaries || !census) return;
    let disposed = false;

    async function draw() {
      const leaflet = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;
      if (!mapRef.current) {
        const map = leaflet
          .map(containerRef.current, { maxZoom: 18 })
          .setView([33.77, 130.49], 12);
        leaflet
          .tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
            attribution:
              '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">地理院タイル</a>',
            maxZoom: 18,
          })
          .addTo(map);
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 50);
      }
      layerRef.current?.remove();
      const config = INDICATORS[indicator];
      const layer = leaflet
        .geoJSON(boundaries, {
          style: (feature?: Feature<Geometry, BoundaryProperties>) => ({
            color: "#64202b",
            weight: 1,
            fillColor: getColor(
              feature ? censusByCode.get(feature.properties.areaCode) : undefined,
              indicator,
            ),
            fillOpacity: 0.72,
          }),
          onEachFeature: (feature, featureLayer) => {
            const properties = feature.properties as BoundaryProperties;
            const censusArea = censusByCode.get(properties.areaCode);
            featureLayer.bindTooltip(
              `${properties.name}｜${config.label} ${censusArea ? formatIndicatorValue(censusArea, indicator) : "データなし"}`,
              { sticky: true },
            );
            featureLayer.on("click", () => setSelected(properties));
          },
        })
        .addTo(mapRef.current);
      layerRef.current = layer;
      if (mapRef.current && layer.getBounds().isValid())
        mapRef.current.fitBounds(layer.getBounds(), { padding: [8, 8] });
    }

    void draw();
    return () => {
      disposed = true;
    };
  }, [boundaries, census, censusByCode, indicator, mode]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    },
    [],
  );

  const config = INDICATORS[indicator];
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>地域情報</p>
          <h2>地域ごとの統計</h2>
          <span>最新値と国勢調査境界を、資料の違いが分かる形で表示します。</span>
        </div>
        <div className={styles.segmented}>
          <button
            className={mode === "community" ? styles.selected : ""}
            type="button"
            onClick={() => setMode("community")}
          >
            最新・郷づくり
          </button>
          <button
            className={mode === "boundary" ? styles.selected : ""}
            type="button"
            onClick={() => setMode("boundary")}
          >
            参考・2020年地図
          </button>
        </div>
      </div>
      <div className={styles.notice}>
        <Info size={18} aria-hidden />
        <span>
          {mode === "community" ? (
            <>
              <strong>福津市公式の最新値です。</strong>{" "}
              2026年10月末の住民基本台帳を表示します。
            </>
          ) : (
            <>
              <strong>地図の数値は2020年国勢調査です。</strong>{" "}
              最新統計と境界区画が一致しないため分けています。
            </>
          )}
        </span>
      </div>

      {mode === "community" ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>郷づくり8地域</h3>
              <p>2026年10月末・福津市公式住民基本台帳</p>
            </div>
            <span className={styles.tag}>最新データ</span>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>地域</th>
                  <th>人口</th>
                  <th>世帯数</th>
                  <th>高齢化率</th>
                </tr>
              </thead>
              <tbody>
                {COMMUNITY_AREAS.map(([name, population, households, agingRate]) => (
                  <tr key={name}>
                    <th>{name}</th>
                    <td>{formatNumber(population)}人</td>
                    <td>{formatNumber(households)}世帯</td>
                    <td>{agingRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.sourceNote}>
            郷づくり地域の正確なGIS境界を確認できていないため、推測の地図を作らず一覧で表示しています。
          </p>
        </section>
      ) : (
        <>
          <div className={styles.toolbar}>
            <div className={styles.segmented}>
              {(["population", "households", "agingRate"] as Indicator[]).map((key) => (
                <button
                  className={indicator === key ? styles.selected : ""}
                  key={key}
                  type="button"
                  onClick={() => setIndicator(key)}
                >
                  {INDICATORS[key].label}
                </button>
              ))}
            </div>
            <span>基準日：2020年10月1日</span>
          </div>
          <div className={styles.mapLayout}>
            <section className={styles.mapPanel}>
              {error ? <p className={styles.error}>{error}</p> : null}
              {!boundaries || !census ? (
                <p className={styles.loading}>地図データを読み込んでいます…</p>
              ) : null}
              <section
                ref={containerRef}
                className={styles.leafletMap}
                aria-label="福津市の国勢調査小地域地図"
              />
              <div className={styles.mapCaption}>
                <Layers3 size={15} />
                令和2年国勢調査 町丁・字等境界（109形状）
              </div>
              <fieldset className={styles.mapLegend}>
                <legend>{config.label}</legend>
                {COLORS.map((color, index) => {
                  const lower = index === 0 ? 0 : config.thresholds[index - 1];
                  const upper = config.thresholds[index];
                  return (
                    <span key={color}>
                      <i style={{ background: color }} />
                      {upper
                        ? `${lower}〜${upper - (indicator === "agingRate" ? 0.01 : 1)}${config.unit}`
                        : `${lower}${config.unit}以上`}
                    </span>
                  );
                })}
                <span>
                  <i style={{ background: "#d5d9dd" }} />
                  データなし
                </span>
              </fieldset>
            </section>
            <aside className={styles.panel}>
              <h3>{selected?.name ?? "地域を選択"}</h3>
              {selected ? (
                <>
                  <dl className={styles.detailList}>
                    <div>
                      <dt>国勢調査地域コード</dt>
                      <dd>{selected.areaCode}</dd>
                    </div>
                    <div>
                      <dt>人口</dt>
                      <dd>
                        {selectedArea?.population == null
                          ? "データなし"
                          : `${formatNumber(selectedArea.population)}人`}
                      </dd>
                    </div>
                    <div>
                      <dt>世帯数</dt>
                      <dd>
                        {selectedArea?.households == null
                          ? "データなし"
                          : `${formatNumber(selectedArea.households)}世帯`}
                      </dd>
                    </div>
                    <div>
                      <dt>高齢化率</dt>
                      <dd>
                        {selectedArea?.agingRate == null
                          ? "データなし"
                          : `${selectedArea.agingRate.toFixed(2)}%`}
                      </dd>
                    </div>
                  </dl>
                  <p className={styles.sourceNote}>
                    上の値は境界と同じ2020年国勢調査です。
                  </p>
                </>
              ) : (
                <p className={styles.sourceNote}>
                  地図上の地域をタップすると統計値を表示します。
                </p>
              )}
              <div className={styles.searchBox}>
                <Search size={17} />
                <input
                  aria-label="2020年国勢調査を地域名で検索"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="地域名で検索"
                />
              </div>
              <p className={styles.searchResultLabel}>2020年国勢調査・{config.label}</p>
              <div className={styles.compactList}>
                {(query ? filteredAreas : boundaryAreas.slice(0, 8)).map((area) => (
                  <button
                    key={area.code}
                    type="button"
                    onClick={() =>
                      setSelected({ areaCode: area.code, name: area.name })
                    }
                  >
                    <span>{area.name}</span>
                    <strong>{formatIndicatorValue(area, indicator)}</strong>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
      <p className={styles.dataDate}>
        {mode === "community"
          ? `最新地域別統計の基準日：${formatDate(data.latestRegional.date)}`
          : `地図・検索結果の基準日：${formatDate(census?.referenceDate ?? "2020-10-01")}（国勢調査）`}
      </p>
    </div>
  );
}
