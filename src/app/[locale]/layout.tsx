import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE_NAME, SITE_URL, BRAND_THEME_COLOR } from "@/lib/siteConfig";
import { Sora, Inter, IBM_Plex_Sans, Noto_Sans_SC } from "next/font/google";
import { AnalyticsGate } from "@/components/AnalyticsGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MotionPreferences } from "@/components/MotionPreferences";
import { PreferencesScript } from "@/components/PreferencesScript";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileNav } from "@/components/MobileNav";
import { PwaClient } from "@/components/PwaClient";
import { CloudAccountBridge } from "@/components/account/CloudAccountBridge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const isDefault = locale === routing.defaultLocale;
  const path = isDefault ? "/" : `/${locale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s · ${SITE_NAME}` },
    description: t("description"),
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
    alternates: {
      canonical: path,
      languages: { en: "/", zh: "/zh", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("title"),
      description: t("description"),
      url: path,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
  };
}

export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: "#0e1511" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enable static rendering for this locale
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col pb-16 sm:pb-0" suppressHydrationWarning>
        <PreferencesScript />
        <NextIntlClientProvider>
          <ThemeProvider>
            <MotionPreferences>
              <TooltipProvider delayDuration={200}>
                <SiteHeader />
                <PwaClient />
                <CloudAccountBridge />
                <div className="flex flex-1 flex-col">{children}</div>
                <SiteFooter />
                <MobileNav />
                <Toaster />
                <AnalyticsGate />
              </TooltipProvider>
            </MotionPreferences>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
