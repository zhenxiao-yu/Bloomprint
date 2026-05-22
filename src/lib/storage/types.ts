/**
 * Storage interfaces — the seam between the app and *where* data lives.
 *
 * The deterministic plan is always regenerable from `intake` + `adjustments` (docs/DECISIONS.md
 * D10), so the local stores persist only those plus a small display summary; the cloud store can
 * additionally snapshot the rendered plan/enhancement/evidence for fast cross-device loads.
 *
 * Every method is async so local and cloud adapters share one shape. `mode` lets the UI label
 * honestly: "Saved on this device" (local) vs "Synced to cloud" (cloud).
 */
import type {
  AIPlanEnhancement,
  DeterministicPlan,
  PlanEvidence,
  PlanScores,
  PropertyProfile,
  RefinementAdjustment,
  YardIntake,
} from "@/domain/models";
import type { SavedPlanSummary } from "@/lib/plansStore";

export type SyncMode = "local" | "cloud";

/** What the UI hands to the store when the user saves a plan. */
export interface SaveProjectInput {
  label: string;
  versionLabel: string;
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  summary: SavedPlanSummary;
  /** Optional rendered snapshots — cloud persists them; local ignores them (regenerates instead). */
  deterministicPlan?: DeterministicPlan;
  aiEnhancement?: AIPlanEnhancement | null;
  scores?: PlanScores;
  evidence?: PlanEvidence;
}

export interface StoredProject {
  id: string;
  label: string;
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  summary: SavedPlanSummary;
  currentVersionId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface StoredPlanVersion {
  id: string;
  projectId: string;
  versionLabel: string;
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  summary: SavedPlanSummary;
  createdAt: number;
}

/** Saved plans / projects + their version history. */
export interface ProjectStore {
  readonly mode: SyncMode;
  listProjects(): Promise<StoredProject[]>;
  getProject(projectId: string): Promise<StoredProject | null>;
  saveProjectWithVersion(input: SaveProjectInput): Promise<StoredProject>;
  updateCurrentVersion(projectId: string, versionId: string): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  listPlanVersions(projectId: string): Promise<StoredPlanVersion[]>;
  comparePlanVersions(
    projectId: string,
    aVersionId: string,
    bVersionId: string,
  ): Promise<[StoredPlanVersion, StoredPlanVersion] | null>;
}

/** The user's saved profile blob and (separately) their property profile. */
export interface ProfileStore {
  readonly mode: SyncMode;
  getProfile(): Promise<Record<string, unknown> | null>;
  saveProfile(profile: Record<string, unknown>): Promise<void>;
  getPropertyProfile(): Promise<PropertyProfile | null>;
  savePropertyProfile(profile: PropertyProfile): Promise<void>;
}

/** Yard photos. Local keeps the data URL on-device; cloud uploads to the private bucket. */
export interface PhotoStore {
  readonly mode: SyncMode;
  /** Persist a photo for a project; returns an opaque reference (data URL locally, path in cloud). */
  saveProjectPhoto(projectId: string, dataUrl: string): Promise<string>;
  /** Resolve a reference to something an <img> can load (data URL or signed URL). */
  getProjectPhotoUrl(projectId: string, ref: string): Promise<string | null>;
  deleteProjectPhoto(projectId: string, ref: string): Promise<void>;
}
