import { BarChart3, Map as MapIcon, MapPinned, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import {
  listCandidates,
  listPosterWork,
} from "@/features/poster-map/services/poster-service";
import { listPostingAreas } from "@/features/posting-map/services/posting-service";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";
import { calculateProgress } from "@/lib/utils/progress";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const candidates = await listCandidates();
  const primaryCandidate = candidates[0];
  const [posterWork, postingAreas] = await Promise.all([
    primaryCandidate ? listPosterWork(primaryCandidate.id) : Promise.resolve([]),
    listPostingAreas(),
  ]);
  const posterProgress = calculateProgress(posterWork.map((item) => item.status));
  const postingProgress = calculateProgress(postingAreas.map((area) => area.status));
  const deliveredTotal = postingAreas.reduce(
    (sum, area) => sum + area.deliveredCount,
    0,
  );

  return (
    <AuthenticatedShell auth={auth}>
      <section className="home-hero">
        <div>
          <p className="eyebrow">2026年12月20日の作業開始に向けた試作</p>
          <h1>作業状況を確認</h1>
          <p>
            現在はすべて架空データです。実際の掲示場資料を受領後、番号と位置を差し替えます。
          </p>
        </div>
        <div className="hero-date-card">
          <span>告示日</span>
          <strong>12月20日</strong>
          <small>正式データ・運用方法は事前に確定</small>
        </div>
      </section>

      <section className="home-grid" aria-label="機能を選択">
        <Link href="/posters" className="feature-card poster-card">
          <span className="feature-icon">
            <MapPinned size={30} aria-hidden />
          </span>
          <span className="feature-kicker">ポスター掲示</span>
          <h2>ポスターマップ</h2>
          <p>掲示場をタップして、担当中・完了・要確認を記録します。</p>
          <div className="card-progress-row">
            <strong>{posterProgress.percent}%</strong>
            <span>
              {posterProgress.completed} / {posterProgress.total}か所完了
            </span>
          </div>
          <span className="card-link">地図を開く →</span>
        </Link>

        <Link href="/posting" className="feature-card posting-card">
          <span className="feature-icon">
            <MapIcon size={30} aria-hidden />
          </span>
          <span className="feature-kicker">告示前の適法性確認済み活動</span>
          <h2>ポスティングマップ</h2>
          <p>区域ごとの担当と配布数を記録し、重複を防ぎます。</p>
          <div className="card-progress-row">
            <strong>{postingProgress.percent}%</strong>
            <span>合計 {deliveredTotal}部</span>
          </div>
          <span className="card-link">地図を開く →</span>
        </Link>

        <Link href="/insight" className="feature-card insight-card">
          <span className="feature-icon">
            <BarChart3 size={30} aria-hidden />
          </span>
          <span className="feature-kicker">地域データ・分析</span>
          <h2>福津インサイト</h2>
          <p>人口や世帯数など、福津市の地域情報をデータで可視化します。</p>
          <div className="card-tags">
            <span>人口</span>
            <span>世帯数</span>
            <span>地域別統計</span>
          </div>
          <span className="card-link">分析データを開く →</span>
        </Link>
      </section>

      <section className="home-note">
        <UsersRound size={24} aria-hidden />
        <div>
          <h2>複数候補者の合同作業にも対応できる設計</h2>
          <p>
            掲示場は共通で管理し、貼付状況は候補者別に記録します。現時点では山本ゆうへいさんだけを表示します。
          </p>
        </div>
      </section>
    </AuthenticatedShell>
  );
}
