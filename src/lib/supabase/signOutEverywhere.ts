"use client";

import { signOut as clearDeviceAccount } from "@/lib/accountStore";
import { getSupabaseBrowserClient } from "./client";

/**
 * Sign out of cloud auth (if a Supabase session exists) and clear the device-account mirror.
 * Used everywhere a signed-in user can sign out, so a cloud user isn't silently re-provisioned
 * by the CloudAccountBridge right after clearing only the local account.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    await getSupabaseBrowserClient()?.auth.signOut();
  } catch {
    /* clear local regardless of cloud outcome */
  }
  clearDeviceAccount();
}
