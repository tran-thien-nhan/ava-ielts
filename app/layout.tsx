// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Học Ngoại Ngữ - Flashcard Đa Ngôn Ngữ",
  description: "Học từ vựng tiếng Anh, Hàn Quốc, Nhật Bản, Trung Quốc và nhiều ngôn ngữ khác với flashcard, có âm thanh và quản lý từ vựng",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}