import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import { PostingMap } from "@/features/posting-map/components/posting-map";
import { listPostingAreas } from "@/features/posting-map/services/posting-service";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";
import { ProgressPanel } from "@/features/shared/components/progress-panel";
import { calculateProgress } from "@/lib/utils/progress";

export const dynamic = "force-dynamic";

export default async function PostingPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const areas = await listPostingAreas();
  const summary = calculateProgress(areas.map((area) => area.status));
  const deliveredTotal = areas.reduce((sum, area) => sum + area.deliveredCount, 0);

  return (
    <AuthenticatedShell auth={auth}>
      <div className="page-heading">
        <Link href="/" className="back-link">
          <ChevronLeft size={18} /> ホームへ
        </Link>
        <p className="eyebrow">告示前の適法性確認済み活動</p>
        <h1>ポスティングマップ</h1>
        <p>
          現在の区域・目標数は試作用です。実運用前に活動内容と期間を管理者が確定します。
        </p>
      </div>
      <ProgressPanel title="区域の進捗" summary={summary} countUnit="区域" />
      <p className="delivered-total">配布済み合計：{deliveredTotal}部</p>
      <PostingMap areas={areas} currentUserRole={auth.profile.role} />
    </AuthenticatedShell>
  );
}
