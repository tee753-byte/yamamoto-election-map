"use client";

import { useMemo, useState } from "react";
import type {
  StatisticsData,
  TownStatistics,
} from "@/features/fukutsu-insight/types/statistics";
import { formatDate, formatNumber } from "@/features/fukutsu-insight/utils/format";
import { AgeCompositionChart } from "./charts";
import styles from "./insight.module.css";

type SortKey = "population" | "households" | "agingRate";

export function AnalysisView({ data }: { data: StatisticsData }) {
  const [selectedCode, setSelectedCode] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("population");
  const selected: TownStatistics = data.latestRegional.towns.find(
    (town) => town.code === selectedCode,
  ) ?? {
    ...data.latestRegional.totals,
    code: "all",
    name: "福津市全体（地域合計）",
  };
  const towns = useMemo(
    () => [...data.latestRegional.towns].sort((a, b) => b[sortKey] - a[sortKey]),
    [data.latestRegional.towns, sortKey],
  );

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>人口・世帯分析</p>
          <h2>{selected.name}</h2>
          <span>公称町・大字等ごとの人口構成を比較します。</span>
        </div>
        <select
          value={selectedCode}
          onChange={(event) => setSelectedCode(event.target.value)}
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
      <div className={styles.notice}>
        <strong>{formatDate(data.latestRegional.date)}</strong>
        <span>福津市オープンデータ。市公式トップ値とは集計時点に差があります。</span>
      </div>
      <section className={styles.analysisSummary}>
        <div>
          <span>総人口</span>
          <strong>{formatNumber(selected.population)}人</strong>
        </div>
        <div>
          <span>総世帯数</span>
          <strong>{formatNumber(selected.households)}世帯</strong>
        </div>
        <div>
          <span>年少人口 0〜14歳</span>
          <strong>{formatNumber(selected.young)}人</strong>
        </div>
        <div>
          <span>生産年齢 15〜64歳</span>
          <strong>{formatNumber(selected.working)}人</strong>
        </div>
        <div>
          <span>老年人口 65歳以上</span>
          <strong>{formatNumber(selected.elderly)}人</strong>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>年代別人口</h3>
            <p>元データの1歳刻みを10歳刻みに集約</p>
          </div>
          <strong>高齢化率 {selected.agingRate.toFixed(2)}%</strong>
        </div>
        <AgeCompositionChart data={selected.ageGroups} />
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h3>地域別一覧</h3>
            <p>指標を選んで多い順に並び替えます。</p>
          </div>
          <div className={styles.segmented}>
            {(["population", "households", "agingRate"] as SortKey[]).map((key) => (
              <button
                className={sortKey === key ? styles.selected : ""}
                key={key}
                type="button"
                onClick={() => setSortKey(key)}
              >
                {key === "population"
                  ? "人口"
                  : key === "households"
                    ? "世帯"
                    : "高齢化率"}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>地域</th>
                <th>総人口</th>
                <th>世帯数</th>
                <th>0〜14歳</th>
                <th>15〜64歳</th>
                <th>65歳以上</th>
                <th>高齢化率</th>
              </tr>
            </thead>
            <tbody>
              {towns.map((town) => (
                <tr key={town.code}>
                  <th>{town.name}</th>
                  <td>{formatNumber(town.population)}</td>
                  <td>{formatNumber(town.households)}</td>
                  <td>{formatNumber(town.young)}</td>
                  <td>{formatNumber(town.working)}</td>
                  <td>{formatNumber(town.elderly)}</td>
                  <td>{town.agingRate.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
