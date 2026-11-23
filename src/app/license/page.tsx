import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/session";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";

export const dynamic = "force-dynamic";

export default async function LicensePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  const sourceCodeUrl =
    process.env.NEXT_PUBLIC_SOURCE_CODE_URL ??
    "https://github.com/tee753-byte/yamamoto-election-map";

  return (
    <AuthenticatedShell auth={auth}>
      <article className="legal-page">
        <Link href="/" className="back-link">
          <ChevronLeft size={18} /> ホームへ
        </Link>
        <p className="eyebrow">オープンソース</p>
        <h1>ライセンスとソースコード</h1>
        <p>
          本アプリは、team-mirai-volunteer/action-boardを実装元として改変したソフトウェアです。
          GNU Affero General Public License v3.0（AGPL-3.0）の条件で提供します。
        </p>
        <h2>ソースコード</h2>
        <p>
          実際の稼働版に対応するソースコードは、
          <a href={sourceCodeUrl} target="_blank" rel="noreferrer">
            GitHubの公開リポジトリ
          </a>
          から無償で取得できます。
        </p>
        <h2>公開しない情報</h2>
        <p>
          秘密鍵、ログイン情報、利用者データ、操作履歴、実際の選挙活動データはソースコードへ含めません。
        </p>
      </article>
    </AuthenticatedShell>
  );
}
