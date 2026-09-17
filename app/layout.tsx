import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "반려견 웰니스 커리큘럼",
  description: "반려견 정보를 입력하면 맞춤 운동·교육 커리큘럼을 7일치로 만들어드려요.",
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
        <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
