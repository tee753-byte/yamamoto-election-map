import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthContext } from "@/features/auth/services/session";
import { BaseMark } from "@/features/shared/components/base-mark";
import { APP_DESCRIPTION } from "@/lib/constants/app";

export const metadata: Metadata = { title: "ログイン" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getAuthContext();
  if (auth) redirect("/");
  const showDemoCredentials = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <BaseMark size={32} />
          </div>
          <p className="login-person-name">山本ゆうへい</p>
          <h1 className="login-base-name">BASE</h1>
          <p className="login-audience">{APP_DESCRIPTION}</p>
        </div>
        <LoginForm showDemoCredentials={showDemoCredentials} />
        {showDemoCredentials ? (
          <div className="demo-credentials">
            <strong>ローカル試作用アカウント</strong>
            <span>管理者: admin@yamamoto-map.local</span>
            <span>パスワード: demo-admin-2026</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
