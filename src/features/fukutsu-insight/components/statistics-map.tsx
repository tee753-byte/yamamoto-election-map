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
  TownStatistics,
} from "@/features/fukutsu-insight/types/statistics";
import { normalizeAreaName } from "@/features/fukutsu-insight/utils/area-name";
import { formatDate, formatNumber } from "@/features/fukutsu-insight/utils/format";
import styles from "./insight.module.css";

type ViewMode = "latest" | "census";
type Indicator = "population" | "households" | "agingRate";
type MapArea = Pick<
  CensusArea | TownStatistics,
  "code" | "name" | "population" | "households" | "agingRate"
>;
const COLORS = ["#f5e9eb", "#e8cdd2", "#d8a6af", "#b96675", "#862d39"];
const INDICATORS: Record<
  Indicator,
  { label: string; unit: string; thresholds: number[] }
> = {
  population: { label: "人口", unit: "人", thresholds: [300, 700, 1200, 2000] },
  households: { label: "世帯数", unit: "世帯", thresholds: [150, 300, 500, 800] },
  agingRate: { label: "高齢化率", unit: "%", thresholds: [20, 30, 40, 50] },
};

function getValue(area: MapArea | undefined, indicator: Indicator) {
  return area?.[indicator] ?? null;
}

function getColor(area: MapArea | undefined, indicator: Indicator) {
  const value = getValue(area, indicator);
  if (value === null) return "#d5d9dd";
  const index = INDICATORS[indicator].thresholds.findIndex(
    (threshold) => value < threshold,
  );
  return COLORS[index === -1 ? COLORS.length - 1 : index];
}

function formatIndicatorValue(area: MapArea, indicator: Indicator) {
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
  const [mode, setMode] = useState<ViewMode>("latest");
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
  const latestByName = useMemo(
    () =>
      new Map(
        data.latestRegional.towns.map((area) => [normalizeAreaName(area.name), area]),
      ),
    [data.latestRegional.towns],
  );
  const censusBoundaryAreas = useMemo(() => {
    const boundaryCodes = new Set(
      boundaries?.features.map((feature) => feature.properties.areaCode) ?? [],
    );
    return census?.areas.filter((area) => boundaryCodes.has(area.code)) ?? [];
  }, [boundaries, census]);
  const activeAreaByBoundaryCode = useMemo(() => {
    const entries =
      boundaries?.features.map((feature) => {
        const area =
          mode === "latest"
            ? latestByName.get(normalizeAreaName(feature.properties.name))
            : censusByCode.get(feature.properties.areaCode);
        return [feature.properties.areaCode, area] as const;
      }) ?? [];
    return new Map(entries);
  }, [boundaries, censusByCode, latestByName, mode]);
  const activeAreas: MapArea[] =
    mode === "latest" ? data.latestRegional.towns : censusBoundaryAreas;
  const selectedArea = selected
    ? mode === "latest"
      ? latestByName.get(normalizeAreaName(selected.name))
      : censusByCode.get(selected.areaCode)
    : undefined;
  const filteredAreas = useMemo(() => {
    const normalizedQuery = normalizeAreaName(query);
    return activeAreas
      .filter((area) => normalizeAreaName(area.name).includes(normalizedQuery))
      .slice(0, 12);
  }, [activeAreas, query]);

  useEffect(() => {
    if (!containerRef.current || !boundaries || !census) return;
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
              feature
                ? activeAreaByBoundaryCode.get(feature.properties.areaCode)
                : undefined,
              indicator,
            ),
            fillOpacity: 0.72,
          }),
          onEachFeature: (feature, featureLayer) => {
            const properties = feature.properties as BoundaryProperties;
            const area = activeAreaByBoundaryCode.get(properties.areaCode);
            featureLayer.bindTooltip(
              `${properties.name}｜${config.label} ${area ? formatIndicatorValue(area, indicator) : "データなし"}`,
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
  }, [activeAreaByBoundaryCode, boundaries, census, indicator]);

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
            className={mode === "latest" ? styles.selected : ""}
            type="button"
            onClick={() => {
              setMode("latest");
              setSelected(undefined);
            }}
          >
            最新統計
          </button>
          <button
            className={mode === "census" ? styles.selected : ""}
            type="button"
            onClick={() => {
              setMode("census");
              setSelected(undefined);
            }}
          >
            2020年国勢調査
          </button>
        </div>
      </div>
      <div className={styles.notice}>
        <Info size={18} aria-hidden />
        <span>
          {mode === "latest" ? (
            <>
              <strong>福津市公式の最新値です。</strong>{" "}
              2026年11月1日の町丁目別住民基本台帳を、2020年国勢調査の境界に名称で対応させています。
            </>
          ) : (
            <>
              <strong>地図と数値は2020年国勢調査です。</strong>{" "}
              当時の状態を確認する参考表示です。
            </>
          )}
        </span>
      </div>

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
        <span>
          基準日：
          {formatDate(
            mode === "latest"
              ? data.latestRegional.date
              : (census?.referenceDate ?? "2020-10-01"),
          )}
        </span>
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
            aria-label={`福津市の${mode === "latest" ? "最新統計" : "国勢調査"}地図`}
          />
          <div className={styles.mapCaption}>
            <Layers3 size={15} />
            境界：令和2年国勢調査 町丁・字等（109形状）
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
                  <dt>
                    {mode === "latest" ? "最新統計地域コード" : "国勢調査地域コード"}
                  </dt>
                  <dd>{selectedArea?.code ?? selected.areaCode}</dd>
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
                {mode === "latest"
                  ? "数値は最新の住民基本台帳、区画線は2020年国勢調査の境界です。"
                  : "数値と区画線は2020年国勢調査です。"}
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
              aria-label={`${mode === "latest" ? "最新統計" : "2020年国勢調査"}を地域名で検索`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="地域名で検索"
            />
          </div>
          <p className={styles.searchResultLabel}>
            {mode === "latest" ? "最新統計" : "2020年国勢調査"}・{config.label}
          </p>
          <div className={styles.compactList}>
            {(query ? filteredAreas : activeAreas.slice(0, 8)).map((area) => (
              <button
                key={area.code}
                type="button"
                onClick={() => setSelected({ areaCode: area.code, name: area.name })}
              >
                <span>{area.name}</span>
                <strong>{formatIndicatorValue(area, indicator)}</strong>
              </button>
            ))}
          </div>
        </aside>
      </div>
      <p className={styles.dataDate}>
        {mode === "latest"
          ? `数値の基準日：${formatDate(data.latestRegional.date)}（住民基本台帳）／境界の基準日：2020/10/01（国勢調査）`
          : `地図・検索結果の基準日：${formatDate(census?.referenceDate ?? "2020-10-01")}（国勢調査）`}
      </p>
    </div>
  );
}
