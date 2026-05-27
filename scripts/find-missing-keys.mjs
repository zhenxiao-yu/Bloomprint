/** Dev-only: find t("...") keys referenced in changed components that are missing from en.json. */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const leaves = new Set();
(function walk(o, p) {
  for (const k of Object.keys(o)) {
    const path = p ? `${p}.${k}` : k;
    if (o[k] && typeof o[k] === "object") walk(o[k], path);
    else leaves.add(path);
  }
})(en, "");

const files = execSync("git status --porcelain", { encoding: "utf8" })
  .split("\n")
  .map((l) => l.slice(3).trim())
  .filter((f) => f.endsWith(".tsx"))
  .concat(
    execSync("git ls-files --others --exclude-standard src/app/[locale]/_components", {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean),
  );

const missing = [];
for (const f of [...new Set(files)]) {
  let src;
  try {
    src = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  // Namespaces used in this file
  const ns = [
    ...src.matchAll(/use(?:Translations|Format)?\s*\(\s*["'`]([\w.]+)["'`]/g),
    ...src.matchAll(/getTranslations\s*\(\s*["'`]([\w.]+)["'`]/g),
    ...src.matchAll(/getTranslations\s*\(\s*\{\s*[^}]*namespace:\s*["'`]([\w.]+)["'`]/g),
  ].map((m) => m[1]);
  const namespaces = [...new Set(ns)];
  // t("key") calls (string literals only)
  const keys = [...src.matchAll(/\bt(?:\.rich|\.has|\.markup)?\s*\(\s*["'`]([\w.]+)["'`]/g)].map(
    (m) => m[1],
  );
  for (const key of [...new Set(keys)]) {
    const candidates = namespaces.length
      ? namespaces.map((n) => `${n}.${key}`)
      : [key];
    if (!candidates.some((c) => leaves.has(c))) {
      missing.push({ file: f, namespaces: namespaces.join("|") || "(none)", key });
    }
  }
}

if (missing.length === 0) {
  console.log("✓ No missing keys detected.");
} else {
  console.log(`✗ ${missing.length} possibly-missing keys:\n`);
  for (const m of missing) console.log(`  [${m.namespaces}] ${m.key}   <- ${m.file}`);
}
