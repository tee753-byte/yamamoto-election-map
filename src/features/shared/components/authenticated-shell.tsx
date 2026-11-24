import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions/auth-actions";
import type { AuthContext } from "@/features/auth/services/session";
import { BaseMark } from "@/features/shared/components/base-mark";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/constants/app";

const ROLE_LABELS = {
  admin: "管理者",
  worker: "作業担当者",
  viewer: "閲覧のみ",
} as const;

interface AuthenticatedShellProps {
  auth: AuthContext;
  children: ReactNode;
}

export function AuthenticatedShell({ auth, children }: AuthenticatedShellProps) {
  return (
    <div className="app-frame">
      <header className="app-header">
        <Link
          href="/"
          className="brand-link"
          aria-label={`${APP_NAME} ホーム`}
          title="ホームへ戻る"
        >
          <span className="brand-mark">
            <BaseMark size={24} />
          </span>
          <span className="brand-copy">
            <small>山本ゆうへい</small>
            <strong>{APP_SHORT_NAME}</strong>
          </span>
        </Link>
        <div className="user-menu">
          <span className="role-badge">{ROLE_LABELS[auth.profile.role]}</span>
          <span className="user-name">{auth.profile.displayName}</span>
          <form action={logoutAction}>
            <button className="icon-button" type="submit" aria-label="ログアウト">
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <p>{APP_NAME}</p>
        <Link href="/license">ライセンスとソースコード</Link>
      </footer>
    </div>
  );
}
