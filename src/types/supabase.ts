/**
 * Supabase Database types.
 *
 * ⚠️ HAND-WRITTEN PLACEHOLDER. These mirror the schema applied to project
 * `xbbmllchylhfwfmcwnle` closely enough to type the adapters, but they are not the
 * canonical generated output. Regenerate and replace this file once you have the CLI/env:
 *
 *   npx supabase gen types typescript --project-id xbbmllchylhfwfmcwnle > src/types/supabase.ts
 *
 * See docs/SUPABASE_MIGRATION.md → "Regenerating types". jsonb payloads are typed as `Json`
 * here; the storage adapters cast them to the domain shapes (intake, plan, etc.) at the edge.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          user_id: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          current_version_id: string | null;
          summary: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          current_version_id?: string | null;
          summary?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          current_version_id?: string | null;
          summary?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_versions: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          version_label: string;
          intake: Json;
          adjustments: Json;
          deterministic_plan: Json | null;
          ai_enhancement: Json | null;
          scores: Json | null;
          evidence: Json | null;
          summary: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          version_label: string;
          intake: Json;
          adjustments?: Json;
          deterministic_plan?: Json | null;
          ai_enhancement?: Json | null;
          scores?: Json | null;
          evidence?: Json | null;
          summary?: Json;
          created_at?: string;
        };
        Update: {
          version_label?: string;
          deterministic_plan?: Json | null;
          ai_enhancement?: Json | null;
        };
        Relationships: [];
      };
      project_photos: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
        };
        Relationships: [];
      };
      source_registry: {
        Row: {
          id: string;
          name: string;
          source_type: string | null;
          level: number;
          url: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          source_type?: string | null;
          level: number;
          url?: string | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          source_type?: string | null;
          level?: number;
          url?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      live_data_cache: {
        Row: {
          key: string;
          value: Json;
          source: Json | null;
          retrieved_at: string;
          expires_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          source?: Json | null;
          retrieved_at?: string;
          expires_at: string;
        };
        Update: {
          value?: Json;
          source?: Json | null;
          retrieved_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      ai_prompt_cache: {
        Row: {
          key: string;
          value: Json;
          created_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          created_at?: string;
        };
        Update: {
          value?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

/** Convenience row aliases used by the storage adapters. */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type PlanVersionRow = Database["public"]["Tables"]["plan_versions"]["Row"];
export type ProjectPhotoRow = Database["public"]["Tables"]["project_photos"]["Row"];
export type LiveDataCacheRow = Database["public"]["Tables"]["live_data_cache"]["Row"];
export type SourceRegistryRow = Database["public"]["Tables"]["source_registry"]["Row"];
