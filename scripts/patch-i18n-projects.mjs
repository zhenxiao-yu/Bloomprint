/** One-shot: deep-merge Phase 9 project-management i18n keys into en.json + zh.json (never overwrites). */
import { readFileSync, writeFileSync } from "node:fs";

const EN = {
  SavedPlans: {
    duplicate: "Duplicate",
    archive: "Archive",
    restore: "Restore",
    archivedTitle: "Archived",
    archivedHint: "Hidden from your list but kept here — restore any time, or delete for good.",
    allArchivedNote: "All your saved plans are archived. Restore one below, or start a new plan.",
    confirmDeleteTitle: "Delete this plan?",
    confirmDeleteBody: '"{label}" will be permanently removed from this device. This can\'t be undone.',
    confirmDeleteCancel: "Cancel",
    confirmDeleteConfirm: "Delete",
    toastDuplicated: 'Duplicated as "{label}"',
    toastArchived: 'Archived "{label}"',
    toastRestored: 'Restored "{label}"',
  },
};

const ZH = {
  SavedPlans: {
    duplicate: "复制",
    archive: "归档",
    restore: "恢复",
    archivedTitle: "已归档",
    archivedHint: "已从列表隐藏，但仍保留在此——可随时恢复，或彻底删除。",
    allArchivedNote: "你保存的方案都已归档。可在下方恢复，或开始一份新方案。",
    confirmDeleteTitle: "删除此方案？",
    confirmDeleteBody: "“{label}”将从此设备永久删除，且无法撤销。",
    confirmDeleteCancel: "取消",
    confirmDeleteConfirm: "删除",
    toastDuplicated: "已复制为“{label}”",
    toastArchived: "已归档“{label}”",
    toastRestored: "已恢复“{label}”",
  },
};

function mergeMissing(dst, src) {
  let added = 0;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      if (!dst[k] || typeof dst[k] !== "object") dst[k] = {};
      added += mergeMissing(dst[k], src[k]);
    } else if (!(k in dst)) {
      dst[k] = src[k];
      added++;
    }
  }
  return added;
}

for (const [file, patch] of [
  ["messages/en.json", EN],
  ["messages/zh.json", ZH],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const added = mergeMissing(json, patch);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: +${added} keys`);
}
