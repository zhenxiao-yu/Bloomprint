/**
 * Local profile store. The user profile blob reuses the existing on-device store
 * (src/lib/profileStore.ts, same key as `useSavedProfileRaw`). The property profile gets its own
 * device key so it can sync independently to the cloud `properties` table later.
 */
import { readSavedProfile, saveProfile as writeProfile } from "@/lib/profileStore";
import { PropertyProfile } from "@/domain/models";
import type { ProfileStore } from "./types";

const PROPERTY_KEY = "bloomprint:v1:property";

function readProperty(): PropertyProfile | null {
  try {
    const raw = localStorage.getItem(PROPERTY_KEY);
    if (!raw) return null;
    const parsed = PropertyProfile.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const localProfileStore: ProfileStore = {
  mode: "local",

  async getProfile() {
    return readSavedProfile();
  },

  async saveProfile(profile) {
    writeProfile(profile);
  },

  async getPropertyProfile() {
    return readProperty();
  },

  async savePropertyProfile(profile) {
    try {
      localStorage.setItem(PROPERTY_KEY, JSON.stringify(profile));
    } catch {
      /* ignore quota / disabled storage */
    }
  },
};
