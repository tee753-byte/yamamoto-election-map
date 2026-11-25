import { BarChart3, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./insight.module.css";
import { InsightNav } from "./insight-nav";

export function InsightShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.feature}>
      <Link className={styles.backLink} href="/">
        <ChevronLeft size={18} aria-hidden /> ホームへ
      </Link>
      <header className={styles.featureHeader}>
        <span className={styles.featureIcon}>
          <BarChart3 size={28} aria-hidden />
        </span>
        <div>
          <p>地域データ・分析</p>
          <h1>福津インサイト</h1>
          <span>福津市の公開統計を、地図とグラフで確認できます。</span>
        </div>
      </header>
      <InsightNav />
      {children}
    </div>
  );
}
