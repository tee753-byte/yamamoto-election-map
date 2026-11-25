"use client";

import { useMemo, useState } from "react";
import type {
  StatisticsData,
  TrendPoint,
} from "@/features/fukutsu-insight/types/statistics";
import { formatNumber, formatSigned } from "@/features/fukutsu-insight/utils/format";
import { MultiTrendChart } from "./charts";
import styles from "./insight.module.css";

export function TrendsView({ data }: { data: StatisticsData }) {
  const [period, setPeriod] = useState<5 | 10>(10);
  const [townCode, setTownCode] = useState("");
  const chartData = useMemo<TrendPoint[]>(() => {
    if (!townCode) return data.trend.slice(-period);
    const selected = data.townTrend.find((town) => town.code === townCode);
    return (selected?.values ?? []).slice(-period).map((point) => ({
      ...point,
      male: 0,
      female: 0,
      young: 0,
      working: 0,
      elderly: 0,
      ageGroups: [],
    }));
  }, [data, period, townCode]);
  const first = chartData.at(0);
  const last = chartData.at(-1);
  const populationChange = first && last ? last.population - first.population : 0;
  const householdChange = first && last ? last.households - first.households : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>人口推移</p>
          <h2>人口・世帯数の変化</h2>
          <span>同じ住民基本台帳の10月1日時点を比較します。</span>
        </div>
        <select
          value={townCode}
          onChange={(event) => setTownCode(event.target.value)}
          aria-label="対象地域"
        >
          <option value="">福津市全体（地域合計）</option>
          {data.latestRegional.towns.map((town) => (
            <option value={town.code} key={town.code}>
              {town.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.segmented}>
          <button
            className={period === 5 ? styles.selected : ""}
            type="button"
            onClick={() => setPeriod(5)}
          >
            直近5年
          </button>
          <button
            className={period === 10 ? styles.selected : ""}
            type="button"
            onClick={() => setPeriod(10)}
          >
            全期間
          </button>
        </div>
        <span>2018年以降の各年10月1日</span>
      </div>
      <section className={styles.twoSummary}>
        <div>
          <span>期間内の人口増減</span>
          <strong>{formatSigned(populationChange)}人</strong>
        </div>
        <div>
          <span>期間内の世帯増減</span>
          <strong>{formatSigned(householdChange)}世帯</strong>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>人口・世帯数の推移</h3>
            <p>グラフに触れると詳細を確認できます。</p>
          </div>
        </div>
        {chartData.length > 1 ? (
          <MultiTrendChart data={chartData} />
        ) : (
          <p>比較できる時系列がありません。</p>
        )}
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>年次データ</h3>
            <p>同一系列のみを掲載</p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>基準日</th>
                <th>総人口</th>
                <th>世帯数</th>
                <th>高齢化率</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((point) => (
                <tr key={point.date}>
                  <th>{point.date.replaceAll("-", "/")}</th>
                  <td>{formatNumber(point.population)}人</td>
                  <td>{formatNumber(point.households)}世帯</td>
                  <td>{point.agingRate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
