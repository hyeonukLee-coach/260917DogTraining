import type { Metadata, Viewport } from "next";
import "./globals.css";

import { AuthProvider } from "@/components/AuthProvider";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "UNIPAWS AI WELLNESS",
  description: "반려견 정보를 입력하면 AI가 맞춤 웰니스 플랜과 오늘의 미션을 제안해드려요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-paper font-sans antialiased">
        <AuthProvider />
        <TopNav />
        <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
