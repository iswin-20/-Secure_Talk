// app/layout.tsx
import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";
import Footer from "./Footer";
import TranslateButton from "./TranslateButton";
import DarkModeToggle from "./DarkModeToggle";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Secure Talk",
  description: "End-to-end encrypted chat. Messages that disappear.",
  icons: {
    icon: "/favicon.ico?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${dmSans.variable} ${inter.variable}`}>
      <body className="font-sans min-h-screen flex flex-col bg-[rgb(var(--bg-primary))]">
        <main className="flex-1 flex justify-center items-center p-4">
          {children}
        </main>
        <Footer />
        <TranslateButton />
        <DarkModeToggle />
      </body>
    </html>
  );
}
