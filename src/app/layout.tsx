import type { Metadata } from "next";
import { Sora, Inter, IBM_Plex_Sans, Noto_Sans_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// Headings — modern, calm, product-like
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], display: "swap" });
// Body — highly readable
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
// Data / evidence labels
const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
// Simplified Chinese fallback
const notoSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const fontVars = `${sora.variable} ${inter.variable} ${plex.variable} ${notoSC.variable}`;

export const metadata: Metadata = {
  title: "Bloomprint — buildable yard plans",
  description: "Bloomprint turns yard inspiration into a buildable plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
