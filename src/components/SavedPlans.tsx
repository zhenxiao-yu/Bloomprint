"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Check,
  Copy,
  CopyPlus,
  GitCompare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  archivePlan,
  deletePlan,
  duplicatePlan,
  renamePlan,
  restorePlan,
  useArchivedPlans,
  type SavedPlan,
} from "@/lib/plansStore";
import { encodeShare } from "@/lib/shareLink";
import { Photo } from "@/components/ui/photo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 6;

function openHref(plan: SavedPlan): string {
  return `/plan?p=${encodeShare({ intake: plan.intake, adjustments: plan.adjustments })}`;
}

export function SavedPlans({
  plans,
  selected,
  onToggle,
  onRename,
  onDelete,
}: {
  plans: SavedPlan[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Notifies the parent that a rename happened (it may clear comparison state). */
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("SavedPlans");
  const tc = useTranslations("Common");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [renaming, setRenaming] = useState<SavedPlan | null>(null);
  const archived = useArchivedPlans();
  // The plan pending a delete confirmation, and whether it's an archived one (deleted directly)
  // vs an active one (routed through the parent's onDelete so it can clear compare state).
  const [confirmDelete, setConfirmDelete] = useState<{ plan: SavedPlan; fromArchive: boolean } | null>(
    null,
  );

  const fuse = useMemo(
    () =>
      new Fuse(plans, {
        keys: ["label", "summary.styleLabel", "summary.goal", "summary.versionLabel"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [plans],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return plans;
    return fuse.search(q).map((r) => r.item);
  }, [query, plans, fuse]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Keep the current page in range when the result set shrinks.
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function onSearch(next: string) {
    setQuery(next);
    setPage(1);
  }

  if (plans.length === 0 && archived.length === 0) {
    return (
      <BlurFade inView>
        <div className="card overflow-hidden p-0">
          <Photo
            src="/photos/raised-bed.jpg"
            alt={t("emptyPhotoAlt")}
            scrim
            sizes="(max-width: 768px) 100vw, 768px"
            className="flex min-h-44 items-end"
          >
            <div className="p-5 sm:p-6">
              <Badge className="glass-chip border-white/30 bg-white/10 text-white">
                {t("emptyBadge")}
              </Badge>
            </div>
          </Photo>
          <div className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
            <div>
              <p className="title-2 text-foreground">{t("emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
                {t("emptyBodyBefore")} <span className="font-semibold">{t("emptySaveLabel")}</span>{" "}
                {t("emptyBodyAfter")}
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-brand text-on-strong hover:bg-brand-strong">
              <Link href="/plan">
                <Plus className="size-4" aria-hidden />
                {tc("startPlan")}
              </Link>
            </Button>
          </div>
        </div>
      </BlurFade>
    );
  }

  function handleRename(label: string) {
    if (!renaming) return;
    const next = label.trim();
    if (next && next !== renaming.label) {
      renamePlan(renaming.id, next);
      onRename(renaming.id);
      toast.success(t("toastRenamed", { label: next }));
    }
    setRenaming(null);
  }

  function handleDuplicate(plan: SavedPlan) {
    const copy = duplicatePlan(plan.id);
    if (copy) toast.success(t("toastDuplicated", { label: copy.label }));
  }

  function handleArchive(plan: SavedPlan) {
    if (selected.includes(plan.id)) onToggle(plan.id); // drop it from any pending comparison
    archivePlan(plan.id);
    toast.success(t("toastArchived", { label: plan.label }));
  }

  function handleRestore(plan: SavedPlan) {
    restorePlan(plan.id);
    toast.success(t("toastRestored", { label: plan.label }));
  }

  function performDelete() {
    if (!confirmDelete) return;
    const { plan, fromArchive } = confirmDelete;
    // Active plans route through the parent so it can clear compare/selection state;
    // archived ones are removed directly (the parent isn't tracking them).
    if (fromArchive) deletePlan(plan.id);
    else onDelete(plan.id);
    toast.success(t("toastDeleted", { label: plan.label }));
    setConfirmDelete(null);
  }

  async function handleCopyLink(plan: SavedPlan) {
    try {
      const url = `${window.location.origin}${openHref(plan)}`;
      await navigator.clipboard?.writeText(url);
      toast.success(t("toastLinkCopied"));
    } catch {
      toast.error(t("toastLinkError"));
    }
  }

  return (
    <div className="space-y-8">
      {plans.length > 0 ? (
        <div>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-11 rounded-full pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-base text-muted-foreground">{t("noMatches")}</div>
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {pageItems.map((plan, i) => {
              const isSelected = selected.includes(plan.id);
              return (
                <BlurFade key={plan.id} inView delay={0.04 * i} className="flex">
                  <li
                    className={`card hover-lift relative flex w-full flex-col p-4 ${
                      isSelected ? "ring-2 ring-brand" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggle(plan.id)}
                        aria-pressed={isSelected}
                        aria-label={t("selectAria", { label: plan.label })}
                        className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                          isSelected
                            ? "border-brand bg-brand text-on-strong"
                            : "border-border text-muted hover:border-brand hover:text-brand"
                        }`}
                      >
                        {isSelected ? <Check className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-base font-semibold capitalize text-foreground">
                            {plan.label}
                          </p>
                          <RowMenu
                            t={t}
                            openHref={openHref(plan)}
                            onRename={() => setRenaming(plan)}
                            onDuplicate={() => handleDuplicate(plan)}
                            onArchive={() => handleArchive(plan)}
                            onDelete={() => setConfirmDelete({ plan, fromArchive: false })}
                            onCompare={() => onToggle(plan.id)}
                            onCopyLink={() => void handleCopyLink(plan)}
                            isSelected={isSelected}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="capitalize">
                            {plan.summary.versionLabel ?? t("draftDefault")}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {plan.summary.styleLabel}
                          </Badge>
                          <Badge variant="outline">
                            {t("confidenceSuffix", { confidence: plan.summary.confidence })}
                          </Badge>
                        </div>
                        <p className="numeric mt-2 text-lg font-semibold text-foreground">
                          ${plan.summary.diyMin.toLocaleString()}–$
                          {plan.summary.diyMax.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("plantTypes", { count: plan.summary.plantCount })} ·{" "}
                          {t("laborHours", { hours: plan.summary.laborHours ?? "?" })} ·{" "}
                          {plan.summary.maintenance
                            ? t("maintenanceSuffix", { level: plan.summary.maintenance })
                            : t("maintenanceUnknown")}
                          {plan.summary.heavyWorkWarning ? ` · ${t("heavyMaterials")}` : ""}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("savedOn", { date: new Date(plan.createdAt).toLocaleDateString() })}
                          {plan.adjustments.length > 0
                            ? ` · ${t("refinements", { count: plan.adjustments.length })}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-3">
                      <Button
                        asChild
                        size="sm"
                        className="w-full rounded-full bg-brand text-on-strong hover:bg-brand-strong"
                      >
                        <Link href={openHref(plan)}>
                          {t("open")}
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </li>
                </BlurFade>
              );
            })}
          </ul>

          {pageCount > 1 ? (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={safePage <= 1}
                    className={safePage <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === safePage}
                      aria-label={t("pageAria", { page: p })}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={safePage >= pageCount}
                    className={safePage >= pageCount ? "pointer-events-none opacity-50" : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(pageCount, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </>
      )}
        </div>
      ) : (
        <div className="card p-8 text-center text-base text-muted-foreground">
          {t("allArchivedNote")}
        </div>
      )}

      {archived.length > 0 ? (
        <ArchivedSection
          archived={archived}
          t={t}
          onRestore={handleRestore}
          onDelete={(plan) => setConfirmDelete({ plan, fromArchive: true })}
        />
      ) : null}

      <RenameDialog
        plan={renaming}
        onClose={() => setRenaming(null)}
        onSubmit={handleRename}
        t={t}
      />
      <ConfirmDeleteDialog
        target={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={performDelete}
        t={t}
      />
    </div>
  );
}

function ArchivedSection({
  archived,
  t,
  onRestore,
  onDelete,
}: {
  archived: SavedPlan[];
  t: ReturnType<typeof useTranslations>;
  onRestore: (plan: SavedPlan) => void;
  onDelete: (plan: SavedPlan) => void;
}) {
  return (
    <section aria-label={t("archivedTitle")} className="rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-5">
      <h2 className="title-3 flex items-center gap-2 text-foreground">
        <Archive className="size-4 text-muted-foreground" aria-hidden />
        {t("archivedTitle")}
        <span className="text-sm font-normal text-muted-foreground">({archived.length})</span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("archivedHint")}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {archived.map((plan) => (
          <li
            key={plan.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium capitalize text-foreground">{plan.label}</p>
              <p className="text-sm text-muted-foreground">
                {t("savedOn", { date: new Date(plan.createdAt).toLocaleDateString() })}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => onRestore(plan)}>
              <ArchiveRestore className="size-4" aria-hidden />
              {t("restore")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted hover:text-[var(--danger)]"
              aria-label={t("delete")}
              onClick={() => onDelete(plan)}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConfirmDeleteDialog({
  target,
  onClose,
  onConfirm,
  t,
}: {
  target: { plan: SavedPlan; fromArchive: boolean } | null;
  onClose: () => void;
  onConfirm: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
          <DialogDescription>
            {target ? t("confirmDeleteBody", { label: target.plan.label }) : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
            {t("confirmDeleteCancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            onClick={onConfirm}
          >
            {t("confirmDeleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowMenu({
  t,
  openHref,
  onRename,
  onDuplicate,
  onArchive,
  onDelete,
  onCompare,
  onCopyLink,
  isSelected,
}: {
  t: ReturnType<typeof useTranslations>;
  openHref: string;
  onRename: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCompare: () => void;
  onCopyLink: () => void;
  isSelected: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mr-1 -mt-1 shrink-0 rounded-full text-muted"
          aria-label={t("rowActionsAria")}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={openHref}>
            <ArrowRight aria-hidden />
            {t("open")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCompare}>
          <GitCompare aria-hidden />
          {isSelected ? t("removeFromCompare") : t("addToCompare")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopyLink}>
          <Copy aria-hidden />
          {t("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>
          <Pencil aria-hidden />
          {t("rename")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>
          <CopyPlus aria-hidden />
          {t("duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onArchive}>
          <Archive aria-hidden />
          {t("archive")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RenameDialog({
  plan,
  onClose,
  onSubmit,
  t,
}: {
  plan: SavedPlan | null;
  onClose: () => void;
  onSubmit: (label: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Dialog open={plan !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        {/* Keyed by plan id so the form (and its initial value) remounts per plan. */}
        {plan ? (
          <RenameForm key={plan.id} plan={plan} onClose={onClose} onSubmit={onSubmit} t={t} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  plan,
  onClose,
  onSubmit,
  t,
}: {
  plan: SavedPlan;
  onClose: () => void;
  onSubmit: (label: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [value, setValue] = useState(plan.label);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <DialogHeader>
        <DialogTitle>{t("renamePrompt")}</DialogTitle>
        <DialogDescription>{t("renameHint")}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-2">
        <Label htmlFor="plan-rename">{t("renameLabel")}</Label>
        <Input
          id="plan-rename"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="capitalize"
        />
      </div>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          {t("renameCancel")}
        </Button>
        <Button
          type="submit"
          disabled={!value.trim()}
          className="rounded-full bg-brand text-on-strong hover:bg-brand-strong"
        >
          {t("renameSave")}
        </Button>
      </DialogFooter>
    </form>
  );
}
