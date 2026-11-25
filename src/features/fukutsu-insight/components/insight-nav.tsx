"use client";

import {
  BarChart3,
  Database,
  LayoutDashboard,
  Map as MapIcon,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./insight.module.css";

const LINKS = [
  { href: "/insight", label: "概要", icon: LayoutDashboard },
  { href: "/insight/map", label: "地域情報", icon: MapIcon },
  { href: "/insight/analysis", label: "人口分析", icon: BarChart3 },
  { href: "/insight/trends", label: "人口推移", icon: TrendingUp },
  { href: "/insight/sources", label: "データ出典", icon: Database },
] as const;

export function InsightNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="福津インサイトのメニュー">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/insight" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            className={active ? styles.navActive : styles.navLink}
            href={href}
            key={href}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
