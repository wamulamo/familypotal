import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "かぞくポータル",
  description: "子どもと保護者のファミリーポータル",
  viewport: { width: "device-width", initialScale: 1, viewportFit: "cover" },
  themeColor: "#4f46e5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "かぞくポータル",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
