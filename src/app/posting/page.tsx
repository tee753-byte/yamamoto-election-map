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
          {areas.some((area) => area.isSample)
            ? "架空の試作区域が含まれています。管理者は地図上で実際の配布区域を追加できます。"
            : "区域ごとの担当と配布数を共有します。管理者は地図上で配布区域を追加できます。"}
        </p>
      </div>
      <ProgressPanel title="区域の進捗" summary={summary} countUnit="区域" />
      <p className="delivered-total">配布済み合計：{deliveredTotal}部</p>
      <PostingMap areas={areas} currentUserRole={auth.profile.role} />
    </AuthenticatedShell>
  );
}
