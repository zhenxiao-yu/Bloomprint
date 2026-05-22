/**
 * Supabase project store (cloud). One row per project in `projects`, with full version history in
 * `plan_versions`. RLS scopes every row to the signed-in user; we still pass `user_id` explicitly
 * so inserts satisfy the policy. jsonb payloads are cast to domain shapes at the edge.
 *
 * Created per-session via `createSupabaseProjectStore(userId)`. Throws only on hard DB errors —
 * the hybrid store catches those and falls back to local (docs/DECISIONS.md D11/D12).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, PlanVersionRow, ProjectRow } from "@/types/supabase";
import type { RefinementAdjustment, YardIntake } from "@/domain/models";
import type { SavedPlanSummary } from "@/lib/plansStore";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ProjectStore,
  SaveProjectInput,
  StoredPlanVersion,
  StoredProject,
} from "./types";

type Client = SupabaseClient<Database>;
const asJson = (v: unknown): Json => v as unknown as Json;
const ms = (iso: string): number => Date.parse(iso) || Date.now();

function versionFromRow(v: PlanVersionRow): StoredPlanVersion {
  return {
    id: v.id,
    projectId: v.project_id,
    versionLabel: v.version_label,
    intake: v.intake as unknown as YardIntake,
    adjustments: (v.adjustments as unknown as RefinementAdjustment[]) ?? [],
    summary: v.summary as unknown as SavedPlanSummary,
    createdAt: ms(v.created_at),
  };
}

function projectFromRows(p: ProjectRow, current: PlanVersionRow | null): StoredProject {
  return {
    id: p.id,
    label: p.label,
    intake: (current?.intake as unknown as YardIntake) ?? ({} as YardIntake),
    adjustments: (current?.adjustments as unknown as RefinementAdjustment[]) ?? [],
    summary: p.summary as unknown as SavedPlanSummary,
    currentVersionId: p.current_version_id,
    createdAt: ms(p.created_at),
    updatedAt: ms(p.updated_at),
  };
}

export function createSupabaseProjectStore(userId: string): ProjectStore {
  function db(): Client {
    const client = getSupabaseBrowserClient();
    if (!client) throw new Error("Supabase is not configured.");
    return client;
  }

  async function currentVersionsFor(rows: ProjectRow[]): Promise<Map<string, PlanVersionRow>> {
    const ids = rows.map((r) => r.current_version_id).filter((id): id is string => Boolean(id));
    if (ids.length === 0) return new Map();
    const { data, error } = await db().from("plan_versions").select("*").in("id", ids);
    if (error) throw error;
    return new Map((data ?? []).map((v) => [v.id, v]));
  }

  return {
    mode: "cloud",

    async listProjects() {
      const { data, error } = await db()
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const versions = await currentVersionsFor(rows);
      return rows.map((p) => projectFromRows(p, p.current_version_id ? versions.get(p.current_version_id) ?? null : null));
    },

    async getProject(projectId) {
      const { data, error } = await db().from("projects").select("*").eq("id", projectId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let current: PlanVersionRow | null = null;
      if (data.current_version_id) {
        const { data: v } = await db()
          .from("plan_versions")
          .select("*")
          .eq("id", data.current_version_id)
          .maybeSingle();
        current = v ?? null;
      }
      return projectFromRows(data, current);
    },

    async saveProjectWithVersion(input: SaveProjectInput) {
      const client = db();
      // Reuse an existing same-named project so re-saving builds version history; else create one.
      const { data: existing } = await client
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .eq("label", input.label)
        .maybeSingle();

      let project = existing ?? null;
      if (!project) {
        const { data, error } = await client
          .from("projects")
          .insert({ user_id: userId, label: input.label, summary: asJson(input.summary) })
          .select("*")
          .single();
        if (error) throw error;
        project = data;
      }

      const { data: version, error: vErr } = await client
        .from("plan_versions")
        .insert({
          project_id: project.id,
          user_id: userId,
          version_label: input.versionLabel,
          intake: asJson(input.intake),
          adjustments: asJson(input.adjustments),
          summary: asJson(input.summary),
          deterministic_plan: input.deterministicPlan ? asJson(input.deterministicPlan) : null,
          ai_enhancement: input.aiEnhancement ? asJson(input.aiEnhancement) : null,
          scores: input.scores ? asJson(input.scores) : null,
          evidence: input.evidence ? asJson(input.evidence) : null,
        })
        .select("*")
        .single();
      if (vErr) throw vErr;

      const { data: updated, error: uErr } = await client
        .from("projects")
        .update({
          current_version_id: version.id,
          summary: asJson(input.summary),
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .select("*")
        .single();
      if (uErr) throw uErr;

      return projectFromRows(updated, version);
    },

    async updateCurrentVersion(projectId, versionId) {
      const { error } = await db()
        .from("projects")
        .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw error;
    },

    async deleteProject(projectId) {
      const client = db();
      // Delete children first in case the FK isn't ON DELETE CASCADE.
      await client.from("plan_versions").delete().eq("project_id", projectId);
      await client.from("project_photos").delete().eq("project_id", projectId);
      const { error } = await client.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },

    async listPlanVersions(projectId) {
      const { data, error } = await db()
        .from("plan_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(versionFromRow);
    },

    async comparePlanVersions(projectId, aVersionId, bVersionId) {
      const { data, error } = await db()
        .from("plan_versions")
        .select("*")
        .eq("project_id", projectId)
        .in("id", [aVersionId, bVersionId]);
      if (error) throw error;
      const a = data?.find((v) => v.id === aVersionId);
      const b = data?.find((v) => v.id === bVersionId);
      if (!a || !b) return null;
      return [versionFromRow(a), versionFromRow(b)];
    },
  };
}
