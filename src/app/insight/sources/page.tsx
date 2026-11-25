import { ExternalLink } from "lucide-react";
import styles from "@/features/fukutsu-insight/components/insight.module.css";
import { getInsightSources } from "@/features/fukutsu-insight/services/statistics-service";
import { formatDate } from "@/features/fukutsu-insight/utils/format";

export default function InsightSourcesPage() {
  const sources = getInsightSources();
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>データ出典</p>
          <h2>使用している公開資料</h2>
          <span>基準日、取得日、利用条件、加工上の注意を確認できます。</span>
        </div>
      </div>
      <div className={styles.notice}>
        <strong>出典表示</strong>
        <span>
          福津市・BODIK・e-Statの公開資料を、出典と加工内容を明示して利用しています。
        </span>
      </div>
      <section className={styles.sourceGrid}>
        {sources.map((source) => (
          <article className={`${styles.panel} ${styles.sourceCard}`} key={source.id}>
            <span className={styles.tag}>実データ</span>
            <h3>{source.title}</h3>
            <p>{source.publisher}</p>
            <dl className={styles.sourceDetails}>
              <div>
                <dt>統計の基準日</dt>
                <dd>{formatDate(source.referenceDate)}</dd>
              </div>
              <div>
                <dt>データ取得日</dt>
                <dd>{formatDate(source.acquiredDate)}</dd>
              </div>
              <div>
                <dt>集計単位</dt>
                <dd>{source.unit}</dd>
              </div>
              <div>
                <dt>更新頻度</dt>
                <dd>{source.updateFrequency}</dd>
              </div>
              <div>
                <dt>利用条件</dt>
                <dd>{source.license}</dd>
              </div>
              <div>
                <dt>注意事項</dt>
                <dd>{source.notes}</dd>
              </div>
            </dl>
            <a href={source.url} target="_blank" rel="noreferrer">
              公開元を開く <ExternalLink size={15} />
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
