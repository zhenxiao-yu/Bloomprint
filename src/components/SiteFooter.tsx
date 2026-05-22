import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
        <p>🌿 Bloomprint — buildable yard plans for real homes.</p>
        <nav className="flex flex-wrap gap-4 sm:ml-auto">
          <Link href="/plan" className="hover:text-foreground">
            Plan
          </Link>
          <Link href="/plans" className="hover:text-foreground">
            Saved
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/guide" className="hover:text-foreground">
            Guide
          </Link>
          <a
            href="https://github.com/zhenxiao-yu/Bloomprint"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
      <p className="mx-auto w-full max-w-5xl px-4 pb-6 text-xs text-muted sm:px-6">
        Plans use the Bloomprint Core Library and approximate regional rules. Prices are ranges, not
        quotes. Accounts and saved plans are stored on your device.
      </p>
    </footer>
  );
}
