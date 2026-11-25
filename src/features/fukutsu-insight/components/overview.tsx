"use client";

import { CalendarDays, Home, Percent, Users } from "lucide-react";
import Link from "next/link";
import type { StatisticsData } from "@/features/fukutsu-insight/types/statistics";
import {
  formatDate,
  formatNumber,
  formatSigned,
} from "@/features/fukutsu-insight/utils/format";
import { AgeCompositionChart, PopulationTrendChart } from "./charts";
import styles from "./insight.module.css";

export function InsightOverview({ data }: { data: StatisticsData }) {
  const headline = data.officialHeadline;
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>FUKUTSU INSIGHT</p>
          <h2>ダッシュボード</h2>
          <span>福津市の人口と世帯の現在地を、公開統計から確認できます。</span>
        </div>
        <span className={styles.dateBadge}>
          <CalendarDays size={17} aria-hidden /> 基準日 {formatDate(headline.asOf)}
        </span>
      </div>

      <div className={styles.notice}>
        <strong>実データ</strong>
        <span>
          福津市公式・住民基本台帳を使用しています。資料間の基準日の違いも表示します。
        </span>
      </div>

      <section className={styles.statGrid} aria-label="福津市の主要統計">
        <article className={styles.statCard}>
          <Users size={20} />
          <span>総人口</span>
          <strong>
            {formatNumber(headline.population)}
            <small>人</small>
          </strong>
          <em>{formatSigned(headline.monthChange)}人 前月比</em>
        </article>
        <article className={styles.statCard}>
          <Home size={20} />
          <span>総世帯数</span>
          <strong>
            {formatNumber(headline.households)}
            <small>世帯</small>
          </strong>
          <em>{(headline.population / headline.households).toFixed(2)}人／世帯</em>
        </article>
        <article className={styles.statCard}>
          <Users size={20} />
          <span>前年比</span>
          <strong>
            {formatSigned(headline.yearChange)}
            <small>人</small>
          </strong>
          <em>前年同月との比較</em>
        </article>
        <article className={styles.statCard}>
          <Percent size={20} />
          <span>高齢化率</span>
          <strong>
            {headline.agingRate.toFixed(2)}
            <small>%</small>
          </strong>
          <em>65歳以上 {formatNumber(headline.elderly)}人</em>
        </article>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>人口推移</h3>
              <p>住民基本台帳・各年10月1日時点</p>
            </div>
            <Link href="/insight/trends">詳しく見る →</Link>
          </div>
          <PopulationTrendChart data={data.trend} />
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>年代別人口構成</h3>
              <p>{formatDate(data.latestRegional.date)}</p>
            </div>
          </div>
          <AgeCompositionChart data={data.latestRegional.totals.ageGroups} />
        </article>
      </section>

      <section className={`${styles.panel} ${styles.regionSummary}`}>
        <div className={styles.panelHeader}>
          <div>
            <h3>地域を見る</h3>
            <p>最新統計と2020年国勢調査境界を混同せずに表示します。</p>
          </div>
          <Link className={styles.primaryLink} href="/insight/map">
            地域情報を開く
          </Link>
        </div>
        <div>
          <span>最新の地域別統計</span>
          <strong>{data.latestRegional.towns.length}</strong>
          <small>福津市公式・{formatDate(data.latestRegional.date)}</small>
        </div>
      </section>
    </div>
  );
}
