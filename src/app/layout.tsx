import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarScout — Real Scholarship & Grant Discovery",
  description:
    "Student-focused scholarship and grant discovery platform powered by the TinyFish API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
