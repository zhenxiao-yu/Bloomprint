import { redirect } from "@/i18n/navigation";

// The dashboard merged into the "My plans" hub (/plans). Keep the route as a
// locale-aware redirect so old links, bookmarks, and the PWA shortcut still land.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/plans", locale });
}
