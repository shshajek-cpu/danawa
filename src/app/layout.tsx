/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "./LayoutWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "렌트제로 - 신차 장기렌트 최저가 비교견적",
  description: "신차 장기렌트 최저가 비교견적 서비스. 국산차·수입차 전 차종 렌트료 비교, 무료 견적 신청까지 한번에.",
  keywords: ["장기렌트", "신차렌트", "렌트카", "자동차렌트", "렌트비교", "렌트제로", "신차견적"],
  openGraph: {
    title: "렌트제로 - 신차 장기렌트 최저가 비교견적",
    description: "국산차·수입차 전 차종 장기렌트 최저가 비교! 무료 견적 신청하세요.",
    siteName: "렌트제로",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin=""
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        {/* Material Symbols for Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gray-100 min-h-screen select-none">
        <ErrorBoundary>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable right-click context menu
              document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
              // Disable common copy shortcuts
              document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
                  e.preventDefault();
                }
                if (e.key === 'F12') { e.preventDefault(); }
              });
              // Disable drag
              document.addEventListener('dragstart', function(e) { e.preventDefault(); });
            `,
          }}
        />
      </body>
    </html>
  );
}
