import type { ContentManifest, Diagnostic } from "@riebeckite/core";
import { diagnostic, normalizeRoutePath } from "./site_integrity_shared.js";
import type { SiteIntegrityOptions } from "./site_integrity_types.js";

export function checkRedirectTargets(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const [path, redirect] of manifest.redirects) {
    const owner = manifest.bySlug.get(redirect.slug);
    const target = owner
      ? normalizeRoutePath(owner.publicLocation.permalink)
      : null;
    if (
      target &&
      manifest.byRoutablePermalink.get(target)?.slug === redirect.slug
    )
      continue;
    diagnostics.push(
      diagnostic(options, {
        code: "content-integrity:redirect-target-missing",
        slug: redirect.slug,
        target: path,
        message: `Redirect "${path}" points to content "${redirect.slug}", but its public target is not available.`,
        suggestion: "Publish the target content or remove the redirect.",
        meta: { redirect: path, targetSlug: redirect.slug, target },
      }),
    );
  }
}

export function checkRedirectCycles(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  const redirectTargets = new Map<string, string>();
  const reportedCycles = new Set<string>();
  for (const [path, redirect] of manifest.publicRedirects) {
    const owner = manifest.bySlug.get(redirect.slug);
    if (owner)
      redirectTargets.set(
        normalizeRoutePath(path),
        normalizeRoutePath(owner.publicLocation.permalink),
      );
  }

  for (const start of redirectTargets.keys()) {
    const seen = new Map<string, number>();
    const chain: string[] = [];
    let current: string | undefined = start;
    while (current) {
      const previousIndex = seen.get(current);
      if (previousIndex !== undefined) {
        const cycle = [...chain.slice(previousIndex), current];
        const key = canonicalCycleKey(cycle);
        if (reportedCycles.has(key)) break;
        reportedCycles.add(key);
        diagnostics.push(
          diagnostic(options, {
            code: "content-integrity:redirect-cycle",
            target: cycle.join(" -> "),
            message: `Redirect cycle detected: ${cycle.join(" -> ")}.`,
            suggestion: "Remove or retarget one redirect in the cycle.",
            meta: { cycle },
          }),
        );
        break;
      }
      seen.set(current, chain.length);
      chain.push(current);
      current = redirectTargets.get(current);
    }
  }
}

export function canonicalCycleKey(cycle: readonly string[]): string {
  const closed = cycle.at(0) === cycle.at(-1) ? cycle.slice(0, -1) : [...cycle];
  const rotations = closed.map((_, index) => [
    ...closed.slice(index),
    ...closed.slice(0, index),
  ]);
  return rotations.map((rotation) => rotation.join("\u0000")).sort()[0] ?? "";
}
