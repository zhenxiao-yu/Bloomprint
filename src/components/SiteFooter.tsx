import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Nav");

  return (
    <footer className="no-print mt-8 border-t border-border bg-surface/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
        <p className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-[0.65rem] font-bold text-on-strong">
            BP
          </span>
          {t("tagline")}
        </p>
        <nav className="flex flex-wrap gap-4 sm:ml-auto">
          <Link href="/plan" className="hover:text-foreground">
            {tNav("plan")}
          </Link>
          <Link href="/plans" className="hover:text-foreground">
            {tNav("saved")}
          </Link>
          <Link href="/about" className="hover:text-foreground">
            {tNav("about")}
          </Link>
          <Link href="/guide" className="hover:text-foreground">
            {tNav("guide")}
          </Link>
          <a
            href="https://github.com/zhenxiao-yu/Bloomprint"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            {t("github")}
          </a>
        </nav>
      </div>
      <p className="mx-auto w-full max-w-6xl px-4 pb-8 text-xs text-muted sm:px-6">{t("disclaimer")}</p>
    </footer>
  );
}
