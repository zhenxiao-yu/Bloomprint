import { redirect } from "@/i18n/navigation";

// Plan detail folded into the unified "open a plan" flow. The "My plans" hub
// (/plans) opens any saved plan by re-entering it, so this read-only route is
// now a locale-aware redirect that keeps old bookmarks working.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/plans", locale });
}
