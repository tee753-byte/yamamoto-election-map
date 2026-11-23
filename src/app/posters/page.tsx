import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import { PosterMap } from "@/features/poster-map/components/poster-map";
import {
  listCandidates,
  listPosterWork,
} from "@/features/poster-map/services/poster-service";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";
import { ProgressPanel } from "@/features/shared/components/progress-panel";
import { calculateProgress } from "@/lib/utils/progress";

export const dynamic = "force-dynamic";

interface PosterPageProps {
  searchParams: Promise<{ candidate?: string }>;
}

export default async function PostersPage({ searchParams }: PosterPageProps) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  const candidates = await listCandidates();
  const params = await searchParams;
  const candidate =
    candidates.find((item) => item.id === params.candidate) ?? candidates[0];

  if (!candidate) {
    return (
      <AuthenticatedShell auth={auth}>
        <p>表示できる候補者が登録されていません。</p>
      </AuthenticatedShell>
    );
  }

  const workItems = await listPosterWork(candidate.id);
  const summary = calculateProgress(workItems.map((item) => item.status));

  return (
    <AuthenticatedShell auth={auth}>
      <div className="page-heading">
        <Link href="/" className="back-link">
          <ChevronLeft size={18} /> ホームへ
        </Link>
        <p className="eyebrow">候補者別の掲示状況</p>
        <h1>ポスターマップ</h1>
        <p>掲示場は共通、完了状態は候補者ごとに分けて記録します。</p>
      </div>

      {candidates.length > 1 ? (
        <nav className="candidate-tabs" aria-label="候補者を選択">
          {candidates.map((item) => (
            <Link
              key={item.id}
              className={item.id === candidate.id ? "active" : ""}
              href={`/posters?candidate=${item.id}`}
            >
              {item.displayName}
            </Link>
          ))}
        </nav>
      ) : null}

      <ProgressPanel
        title={`${candidate.displayName}の掲示進捗`}
        summary={summary}
        countUnit="か所"
      />
      <PosterMap
        candidate={candidate}
        workItems={workItems}
        currentUserRole={auth.profile.role}
      />
    </AuthenticatedShell>
  );
}
