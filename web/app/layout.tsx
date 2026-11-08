import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

export const metadata: Metadata = {
  title: "Luyện đề cùng con",
  description: "Luyện đề thi toán không áp lực — con vui học, bố mẹ an tâm theo dõi.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
