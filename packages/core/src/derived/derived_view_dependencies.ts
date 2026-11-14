import { stableStringify } from "../plugin/plugin_memo.js";
import type { OutputDependency } from "../types/output_dependency.js";
import type { DerivedDependency } from "./derived_view_types.js";

export function derivedDependenciesToOutputDependencies(
  dependencies: readonly DerivedDependency[],
): readonly OutputDependency[] {
  const outputDependencies: OutputDependency[] = [];
  for (const dependency of dependencies) {
    switch (dependency.type) {
      case "content":
      case "frontmatter":
        outputDependencies.push({ type: "content", slug: dependency.id });
        break;
      case "file":
        outputDependencies.push({ type: "file", path: dependency.id });
        break;
      case "external":
        outputDependencies.push({ type: "external", id: dependency.id });
        break;
      case "query":
        if (dependency.query && dependency.fingerprint) {
          outputDependencies.push({
            type: "derived-query",
            id: dependency.id,
            fingerprint: dependency.fingerprint,
          });
        } else {
          outputDependencies.push({ type: "unknown" });
        }
        break;
      case "unknown":
        outputDependencies.push({ type: "unknown" });
        break;
      case "view":
        break;
      default:
        outputDependencies.push({ type: "unknown" });
        break;
    }
  }
  const seen = new Set<string>();
  return outputDependencies.filter((dependency) => {
    const key = stableStringify(dependency);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
