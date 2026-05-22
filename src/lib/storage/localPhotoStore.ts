/**
 * Local photo store — keeps the yard photo on-device (localStorage), honoring the existing
 * "stays in your browser" promise (src/components/PhotoPanel.tsx). The reference is a marker; the
 * data URL itself lives under a per-project key.
 */
import type { PhotoStore } from "./types";

const PREFIX = "bloomprint:v1:photo:";
const LOCAL_REF = "local";

export const localPhotoStore: PhotoStore = {
  mode: "local",

  async saveProjectPhoto(projectId, dataUrl) {
    try {
      localStorage.setItem(PREFIX + projectId, dataUrl);
    } catch {
      /* ignore quota / disabled storage */
    }
    return LOCAL_REF;
  },

  async getProjectPhotoUrl(projectId) {
    try {
      return localStorage.getItem(PREFIX + projectId);
    } catch {
      return null;
    }
  },

  async deleteProjectPhoto(projectId) {
    try {
      localStorage.removeItem(PREFIX + projectId);
    } catch {
      /* ignore */
    }
  },
};
