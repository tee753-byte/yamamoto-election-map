import {
  BarChart3,
  CalendarDays,
  Map as MapIcon,
  MapPinned,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import {
  listCandidates,
  listPosterWork,
} from "@/features/poster-map/services/poster-service";
import { listPostingAreas } from "@/features/posting-map/services/posting-service";
import { STATUS_CONFIG } from "@/features/schedule/constants/schedule-config";
import { listUpcomingScheduleEvents } from "@/features/schedule/services/schedule-service";
import { compactTime, formatJapaneseDate } from "@/features/schedule/utils/date";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";
import { calculateProgress } from "@/lib/utils/progress";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const candidates = await listCandidates();
  const primaryCandidate = candidates[0];
  const [posterWork, postingAreas, upcomingEvents] = await Promise.all([
    primaryCandidate ? listPosterWork(primaryCandidate.id) : Promise.resolve([]),
    listPostingAreas(),
    listUpcomingScheduleEvents(3),
  ]);
  const posterProgress = calculateProgress(posterWork.map((item) => item.status));
  const postingProgress = calculateProgress(postingAreas.map((area) => area.status));
  const deliveredTotal = postingAreas.reduce(
    (sum, area) => sum + area.deliveredCount,
    0,
  );

  return (
    <AuthenticatedShell auth={auth}>
      <aside className="home-status-notice" aria-label="試作データに関するお知らせ">
        <span>
          <strong>告示日</strong> 2026年12月20日
        </span>
        <span>現在は架空データです。正式資料の受領後に差し替えます。</span>
      </aside>

      <section className="home-schedule" aria-labelledby="home-schedule-title">
        <div className="home-schedule-heading">
          <h2 id="home-schedule-title">
            <CalendarDays size={20} /> 直近のスケジュール
          </h2>
          <Link href="/schedule">すべて見る →</Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="home-schedule-list">
            {upcomingEvents.map((event) => (
              <Link href="/schedule" key={event.id} className="home-schedule-item">
                <time dateTime={event.startDate}>
                  {formatJapaneseDate(event.startDate)}
                </time>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.isAllDay
                      ? "終日"
                      : event.timeTbd
                        ? event.timeNote || "時間未定"
                        : compactTime(event.startTime) || event.timeNote || "時刻未定"}
                  </small>
                </span>
                <em className={`schedule-status-${event.status}`}>
                  {STATUS_CONFIG[event.status].label}
                </em>
              </Link>
            ))}
          </div>
        ) : (
          <p className="home-schedule-empty">今後の予定はまだ登録されていません。</p>
        )}
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

        <Link href="/schedule" className="feature-card schedule-card">
          <span className="feature-icon">
            <CalendarDays size={30} aria-hidden />
          </span>
          <span className="feature-kicker">予定・情報共有</span>
          <h2>スケジュール</h2>
          <p>今後の予定やメンバーの参加可能時間を確認・共有します。</p>
          <span className="card-link">スケジュールを開く →</span>
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
