import type {
  AIPlanEnhancement,
  DeterministicPlan,
  RefinementAdjustment,
  YardIntake,
} from "@/domain/models";
import type { SavedPlanSummary } from "@/lib/plansStore";

export type UserMode = "homeowner" | "landscaper" | "store_staff";
export type WorkspaceType = "personal" | "landscaping_business" | "store";
export type ProjectKind = "my_home" | "client_property" | "store_customer";
export type SessionStatus = "draft" | "analyzing" | "ready" | "approved" | "archived";
export type PhotoAssetType =
  | "front_yard"
  | "backyard"
  | "side_yard"
  | "problem_area"
  | "existing_plants"
  | "soil_drainage"
  | "measurement"
  | "inspiration";

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  userMode: UserMode;
  createdAt: number;
  updatedAt: number;
}

export interface Client {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Property {
  id: string;
  workspaceId: string;
  clientId?: string;
  nickname: string;
  addressOptional?: string;
  region?: string;
  climateZone?: string;
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PhotoAssumption {
  id: string;
  label: string;
  value: string;
  confidence: "low" | "medium" | "good";
  editable: boolean;
}

export interface DetectedZone {
  id: string;
  label: string;
  type: "planting_bed" | "lawn" | "walkway" | "driveway" | "foundation" | "privacy_gap" | "problem_area";
  confidence: number;
  note?: string;
}

export interface PhotoAnalysisResult {
  zones: DetectedZone[];
  detectedObjects: string[];
  assumptions: PhotoAssumption[];
  missingInfo: string[];
  risks: string[];
  confidence: number;
  generatedAt: number;
}

export interface PhotoAsset {
  id: string;
  propertyId?: string;
  sessionId: string;
  type: PhotoAssetType;
  localBlobId: string;
  fileName?: string;
  previewUrl?: string;
  aiAnalysis?: PhotoAnalysisResult;
  createdAt: number;
  updatedAt: number;
}

export interface PlanningSession {
  id: string;
  workspaceId: string;
  propertyId?: string;
  projectKind: ProjectKind;
  status: SessionStatus;
  currentStep: "project" | "photos" | "analysis" | "details" | "plan";
  autosaveData: Record<string, unknown>;
  photoIds: string[];
  lastSavedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspacePlan {
  id: string;
  propertyId?: string;
  sessionId: string;
  title: string;
  version: string;
  goal?: YardIntake["goal"];
  budget?: number;
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  summary: SavedPlanSummary;
  deterministicPlan?: DeterministicPlan;
  aiEnhancement?: AIPlanEnhancement | null;
  status: "draft" | "ready" | "approved" | "archived";
  createdAt: number;
  updatedAt: number;
}

export interface PlanVersion {
  id: string;
  planId: string;
  label: string;
  createdAt: number;
  changes: string[];
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  summary: SavedPlanSummary;
}
