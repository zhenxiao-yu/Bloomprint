"use client";

/**
 * Pro dashboard — a device-local project workspace for landscapers: pipeline
 * board, client roster, and a consolidated buy list across linked plans. All
 * data lives in localStorage (proStore); plans regenerate deterministically from
 * their saved intake, so shopping numbers are real engine output, never faked.
 */
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  ExternalLink,
  FileCheck2,
  Layers,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/photo";
import { generateDeterministicPlan } from "@/domain/plan";
import { getSavedPlan, useSavedPlans } from "@/lib/plansStore";
import { encodeShare, SHARE_PARAM } from "@/lib/shareLink";
import { REGION_OPTIONS } from "@/lib/uiOptions";
import {
  addClient,
  addProject,
  clearProWorkspace,
  consolidateShoppingItems,
  deleteProject,
  groupByStatus,
  moveProject,
  PRO_STATUSES,
  proStats,
  seedSampleWorkspace,
  STATUS_LABEL,
  updateProject,
  useProClients,
  useProProjects,
  type ConsolidatedItem,
  type ProClient,
  type ProProject,
  type ProStatus,
} from "@/lib/pro/proStore";

type View = "pipeline" | "clients" | "buylist";

const STATUS_TONE: Record<ProStatus, string> = {
  lead: "bg-border/60 text-muted",
  quoted: "bg-warn/15 text-warn",
  approved: "bg-brand-soft text-brand-strong",
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-brand-soft text-brand-strong",
  done: "bg-border/60 text-muted",
};

function money(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function msToDateInput(ms?: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function dateInputToMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}
function planShareHref(savedPlanId?: string): string | null {
  if (!savedPlanId) return null;
  const plan = getSavedPlan(savedPlanId);
  if (!plan) return null;
  return `/plan?${SHARE_PARAM}=${encodeShare({ intake: plan.intake, adjustments: plan.adjustments })}`;
}

export function ProDashboard() {
  const clients = useProClients();
  const projects = useProProjects();
  const [view, setView] = useState<View>("pipeline");
  const [editing, setEditing] = useState<ProProject | "new" | null>(null);

  const stats = useMemo(() => proStats(projects), [projects]);
  const isEmpty = clients.length === 0 && projects.length === 0;

  if (isEmpty) {
    return (
      <main className="aurora mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
        <ProHeader onNewProject={() => setEditing("new")} />
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <BriefcaseBusiness className="size-10 text-brand" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your project workspace is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Track client jobs from lead to done, link each to a buildable Bloomprint plan, and pull
              one consolidated shopping list across jobs. Everything stays on this device.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
            >
              <Plus className="size-4" aria-hidden />
              Add your first project
            </button>
            <button
              type="button"
              onClick={() => seedSampleWorkspace()}
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-brand"
            >
              Load sample workspace
            </button>
          </div>
        </div>
        {editing ? (
          <ProjectDialog
            project={editing === "new" ? null : editing}
            clients={clients}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <ProHeader onNewProject={() => setEditing("new")} />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Active projects" value={String(stats.active)} />
        <StatCard icon={FileCheck2} label="Awaiting approval" value={String(stats.awaitingApproval)} />
        <StatCard icon={CalendarDays} label="Scheduled this week" value={String(stats.scheduledSoon)} />
        <StatCard icon={DollarSign} label="Pipeline value" value={money(stats.pipelineValue)} />
      </section>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1 text-sm">
        {(
          [
            ["pipeline", "Pipeline", BriefcaseBusiness],
            ["clients", "Clients", Users],
            ["buylist", "Buy list", ClipboardList],
          ] as [View, string, typeof Users][]
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 font-semibold transition ${
              view === key ? "bg-brand text-on-strong" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {view === "pipeline" ? (
        <PipelineBoard projects={projects} clients={clients} onOpen={setEditing} />
      ) : null}
      {view === "clients" ? <ClientsView clients={clients} projects={projects} /> : null}
      {view === "buylist" ? <BuyListView projects={projects} /> : null}

      <p className="flex items-center gap-2 text-xs text-muted">
        <CheckCircle2 className="size-3.5 text-brand" aria-hidden />
        Saved on this device. Prices are estimate ranges from the Bloomprint engine — confirm local
        availability before buying.
        <button
          type="button"
          onClick={() => {
            if (confirm("Clear all pro projects and clients on this device?")) clearProWorkspace();
          }}
          className="ml-auto rounded-full border border-border px-2 py-1 font-semibold text-muted transition hover:border-danger/40 hover:text-danger"
        >
          Clear workspace
        </button>
      </p>

      {editing ? (
        <ProjectDialog
          project={editing === "new" ? null : editing}
          clients={clients}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </main>
  );
}

function ProHeader({ onNewProject }: { onNewProject: () => void }) {
  return (
    <Photo
      src="/photos/yard-lawn.jpg"
      alt="A manicured lawn bordered by a modern fence"
      priority
      scrim
      sizes="(max-width: 1152px) 100vw, 1152px"
      className="flex min-h-52 rounded-3xl ring-1 ring-foreground/10"
    >
      <header className="mt-auto flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Pro workspace</p>
          <h1 className="mt-1 text-3xl font-semibold text-white drop-shadow-sm sm:text-4xl">
            Organize jobs, plans, and shopping lists
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            A lightweight operations board for landscapers — clients, a job pipeline, and one buy
            list across every linked plan.
          </p>
        </div>
        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
        >
          <Plus className="size-4" aria-hidden />
          New project
        </button>
      </header>
    </Photo>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="card hover-lift p-4">
      <span className="mb-2 flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PipelineBoard({
  projects,
  clients,
  onOpen,
}: {
  projects: ProProject[];
  clients: ProClient[];
  onOpen: (p: ProProject) => void;
}) {
  const groups = useMemo(() => groupByStatus(projects), [projects]);
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name;
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
      {PRO_STATUSES.map((status) => (
        <div key={status} className="flex min-w-[230px] flex-1 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            <span className="text-xs text-muted">{groups[status].length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {groups[status].map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                clientName={clientName(project.clientId)}
                onOpen={() => onOpen(project)}
              />
            ))}
            {groups[status].length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted">
                Nothing here
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({
  project,
  clientName,
  onOpen,
}: {
  project: ProProject;
  clientName?: string;
  onOpen: () => void;
}) {
  return (
    <div className="card hover-lift p-3 text-left shadow-sm">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <p className="text-sm font-semibold text-foreground">{project.title}</p>
        {clientName ? <p className="mt-0.5 text-xs text-muted">{clientName}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          {project.savedPlanId ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-strong">
              <CheckCircle2 className="size-3" aria-hidden />
              Plan linked
            </span>
          ) : (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">No plan yet</span>
          )}
          {typeof project.priceQuoted === "number" && project.priceQuoted > 0 ? (
            <span className="text-muted">{money(project.priceQuoted)}</span>
          ) : null}
          {project.scheduledFor ? (
            <span className="inline-flex items-center gap-1 text-muted">
              <CalendarDays className="size-3" aria-hidden />
              {new Date(project.scheduledFor).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </button>
      <label className="mt-2 block">
        <span className="sr-only">Move {project.title} to another stage</span>
        <select
          value={project.status}
          onChange={(e) => moveProject(project.id, e.target.value as ProStatus)}
          className="w-full rounded-lg border border-border bg-background p-1.5 text-xs text-foreground"
        >
          {PRO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ClientsView({ clients, projects }: { clients: ProClient[]; projects: ProProject[] }) {
  const [name, setName] = useState("");
  const countFor = (id: string) => projects.filter((p) => p.clientId === id).length;
  return (
    <section className="flex flex-col gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            addClient({ name });
            setName("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a client by name"
          className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
        >
          <Plus className="size-4" aria-hidden />
          Add
        </button>
      </form>
      {clients.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
          No clients yet. Add one above, or attach clients when you create projects.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div key={client.id} className="card hover-lift p-4">
              <p className="text-sm font-semibold text-foreground">{client.name}</p>
              {client.email ? <p className="mt-0.5 text-xs text-muted">{client.email}</p> : null}
              {client.phone ? <p className="text-xs text-muted">{client.phone}</p> : null}
              <p className="mt-2 text-xs font-medium text-brand-strong">
                {countFor(client.id)} project{countFor(client.id) === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BuyListView({ projects }: { projects: ProProject[] }) {
  // Regenerate each linked, non-done project's plan and consolidate the shopping lists.
  const { items, projectCount, missing } = useMemo(() => {
    const perProject: { projectId: string; items: ReturnType<typeof generateDeterministicPlan>["shoppingList"] }[] = [];
    let missing = 0;
    for (const project of projects) {
      if (project.status === "done") continue;
      if (!project.savedPlanId) {
        missing += 1;
        continue;
      }
      const saved = getSavedPlan(project.savedPlanId);
      if (!saved) {
        missing += 1;
        continue;
      }
      const plan = generateDeterministicPlan(saved.intake, { adjustments: saved.adjustments });
      perProject.push({ projectId: project.id, items: plan.shoppingList });
    }
    return { items: consolidateShoppingItems(perProject), projectCount: perProject.length, missing };
  }, [projects]);

  const totalMin = items.reduce((s, i) => s + i.priceMin, 0);
  const totalMax = items.reduce((s, i) => s + i.priceMax, 0);

  function copyList() {
    const text = items
      .map((i) => `${i.quantity} ${i.unit} — ${i.name} (${money(i.priceMin)}–${money(i.priceMax)})`)
      .join("\n");
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  if (items.length === 0) {
    return (
      <section className="card p-6 text-center">
        <ClipboardList className="mx-auto mb-2 size-7 text-brand" aria-hidden />
        <p className="text-sm font-semibold text-foreground">No materials to consolidate yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          Link a saved Bloomprint plan to your active projects and their shopping lists merge into one
          buy list here.{missing > 0 ? ` ${missing} active project(s) have no linked plan.` : ""}
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardList className="size-5 text-brand" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Consolidated buy list</h2>
        <span className="text-xs text-muted">across {projectCount} project(s)</span>
        <button
          type="button"
          onClick={copyList}
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:border-brand"
        >
          <Copy className="size-3.5" aria-hidden />
          Copy
        </button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Est. range</th>
              <th className="py-2">Jobs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <BuyRow key={`${item.name}-${item.unit}-${item.category}`} item={item} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold text-foreground">
              <td className="py-2" colSpan={2}>
                Estimated total
              </td>
              <td className="py-2">
                {money(totalMin)}–{money(totalMax)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {missing > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {missing} active project(s) have no linked plan and aren&apos;t included.
        </p>
      ) : null}
    </section>
  );
}

function BuyRow({ item }: { item: ConsolidatedItem }) {
  return (
    <tr>
      <td className="py-2">
        <span className="font-medium text-foreground">{item.name}</span>
        {item.priority === "buy-first" ? (
          <span className="ml-2 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-strong">
            buy first
          </span>
        ) : null}
        <span className="block text-[11px] text-muted">{item.category}</span>
      </td>
      <td className="py-2 text-muted">
        {item.quantity} {item.unit}
      </td>
      <td className="py-2 text-muted">
        {money(item.priceMin)}–{money(item.priceMax)}
      </td>
      <td className="py-2 text-muted">{item.projectCount}</td>
    </tr>
  );
}

function ProjectDialog({
  project,
  clients,
  onClose,
}: {
  project: ProProject | null;
  clients: ProClient[];
  onClose: () => void;
}) {
  const savedPlans = useSavedPlans();
  const [title, setTitle] = useState(project?.title ?? "");
  const [clientId, setClientId] = useState(project?.clientId ?? "");
  const [newClient, setNewClient] = useState("");
  const [address, setAddress] = useState(project?.address ?? "");
  const [regionId, setRegionId] = useState(project?.regionId ?? "");
  const [status, setStatus] = useState<ProStatus>(project?.status ?? "lead");
  const [scheduled, setScheduled] = useState(msToDateInput(project?.scheduledFor));
  const [price, setPrice] = useState(project?.priceQuoted ? String(project.priceQuoted) : "");
  const [savedPlanId, setSavedPlanId] = useState(project?.savedPlanId ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");

  const linkedHref = planShareHref(savedPlanId || undefined);

  function save() {
    let resolvedClientId = clientId || undefined;
    if (!resolvedClientId && newClient.trim()) resolvedClientId = addClient({ name: newClient }).id;
    const payload = {
      title: title.trim() || "Untitled project",
      clientId: resolvedClientId,
      address: address.trim() || undefined,
      regionId: regionId || undefined,
      status,
      scheduledFor: dateInputToMs(scheduled),
      priceQuoted: price ? Number(price) : null,
      savedPlanId: savedPlanId || undefined,
      notes: notes.trim() || undefined,
    };
    if (project) updateProject(project.id, payload);
    else addProject(payload);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={project ? "Edit project" : "New project"}
      onClick={onClose}
    >
      <div
        className="animate-fade-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-4">
          <h2 className="text-base font-semibold text-foreground">
            {project ? "Edit project" : "New project"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full border border-border p-2 text-muted transition hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4 text-sm">
          <Field label="Project title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Front-yard privacy screen" />
          </Field>

          <Field label="Client">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">— No client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!clientId ? (
              <input
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className={`${inputCls} mt-2`}
                placeholder="…or type a new client name"
              />
            ) : null}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as ProStatus)} className={inputCls}>
                {PRO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Install date">
              <input type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quoted price ($)">
              <input
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
                placeholder="Your quote"
              />
            </Field>
            <Field label="Region">
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputCls}>
                <option value="">— Optional —</option>
                {REGION_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Property address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Optional" />
          </Field>

          <Field label="Linked Bloomprint plan">
            <select value={savedPlanId} onChange={(e) => setSavedPlanId(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {savedPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {money(p.summary.diyMin)}–{money(p.summary.diyMax)}
                </option>
              ))}
            </select>
            {savedPlans.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                No saved plans yet. <Link href="/plan" className="font-semibold text-brand">Build one</Link> and save it to link here.
              </p>
            ) : null}
            {linkedHref ? (
              <Link href={linkedHref} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                <ExternalLink className="size-3.5" aria-hidden />
                Open the linked plan
              </Link>
            ) : null}
          </Field>

          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} min-h-20`} placeholder="Site notes, access, follow-ups…" />
          </Field>
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          {project ? (
            <button
              type="button"
              onClick={() => {
                deleteProject(project.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm font-semibold text-danger transition hover:border-danger/40"
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            className="ml-auto rounded-full bg-brand px-6 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
          >
            {project ? "Save changes" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
