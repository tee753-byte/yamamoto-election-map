import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthContext } from "@/features/auth/services/session";
import { InsightShell } from "@/features/fukutsu-insight/components/insight-shell";
import { AuthenticatedShell } from "@/features/shared/components/authenticated-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "福津インサイト",
  description: "人口や世帯数など、福津市の地域情報をデータで可視化します。",
};

export default async function InsightLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  return (
    <AuthenticatedShell auth={auth}>
      <InsightShell>{children}</InsightShell>
    </AuthenticatedShell>
  );
}
