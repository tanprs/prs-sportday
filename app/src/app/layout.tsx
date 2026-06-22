import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "กีฬาสี 2569",
  description: "ระบบบริหารจัดการกีฬาสีโรงเรียน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
