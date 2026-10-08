"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";

const NAV = [
  { href: "/", label: "활동지 평가" },
  { href: "/rubrics", label: "평가 기준" },
];

/** 로그인이 필요한 화면을 감싸는 공통 레이아웃 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="center-screen muted">불러오는 중…</div>;
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            활동지 AI 평가
          </Link>
          <nav className="nav">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={active ? "active" : ""}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="user">
            <span className="muted small">{user.email}</span>
            <button className="btn ghost small" onClick={() => logout()}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
