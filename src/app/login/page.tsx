import { MapPinned, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthContext } from "@/features/auth/services/session";

export const metadata: Metadata = { title: "ログイン" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getAuthContext();
  if (auth) redirect("/");
  const showDemoCredentials = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <MapPinned size={30} aria-hidden />
        </div>
        <p className="eyebrow">山本ゆうへい陣営・内部作業用</p>
        <h1>活動マップにログイン</h1>
        <p className="login-intro">
          ポスター掲示とポスティングの進み具合を、スマートフォンから共有します。
        </p>
        <LoginForm showDemoCredentials={showDemoCredentials} />
        {showDemoCredentials ? (
          <div className="demo-credentials">
            <strong>ローカル試作用アカウント</strong>
            <span>管理者: admin@yamamoto-map.local</span>
            <span>パスワード: demo-admin-2026</span>
          </div>
        ) : null}
        <p className="security-note">
          <ShieldCheck size={18} aria-hidden />
          ログインしていない人は、活動データを閲覧できません。
        </p>
      </section>
    </main>
  );
}
