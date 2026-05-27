import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import en from "../../messages/en.json";
import zh from "../../messages/zh.json";

type Locale = "en" | "zh";

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
};

interface RenderWithIntlOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale;
}

/**
 * Render a client component inside the real next-intl + next-themes providers,
 * using the project's actual messages JSON so assertions match shipped copy.
 */
export function renderWithIntl(ui: ReactElement, options: RenderWithIntlOptions = {}) {
  const { locale = "en", ...rest } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        <ThemeProvider attribute="class" enableSystem defaultTheme="system">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
