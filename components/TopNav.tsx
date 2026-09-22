"use client";

import Image from "next/image";
import Link from "next/link";
import { PawPrint, User, Users } from "lucide-react";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const LINKS = [
  { href: "/dogs", label: "내 강아지", icon: PawPrint },
  { href: "/community", label: "커뮤니티", icon: Users },
  { href: "/mypage", label: "마이페이지", icon: User },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="UNIPAWS 홈으로">
          <Image src="/logo-wordmark.webp" alt="UNIPAWS" width={112} height={28} priority className="h-6 w-auto sm:h-7" />
        </Link>
        <nav className="flex items-center gap-3">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-cocoa"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <GoogleSignInButton />
      </div>
    </header>
  );
}
