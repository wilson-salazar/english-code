import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FloatingVocabulary from "@/components/FloatingVocabulary";
import SessionNotice from "@/components/SessionNotice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English Code",
  description: "Technical English for QA engineers and software developers",
  appleWebApp: {
    capable: true,
    title: "English Code",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Browser extensions (e.g. ColorZilla) add attributes to <body> before React hydrates;
          this silences only that harmless mismatch on <body> itself, not on its children. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <FloatingVocabulary />
        <SessionNotice />
      </body>
    </html>
  );
}
