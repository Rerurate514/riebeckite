import {
  type ContentManifest,
  type Diagnostic,
  definePlugin,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import { mergePlannedOutputs, planDeployOutputs } from "./providers.js";
import type { DeployOptions, PublicRedirect } from "./types.js";

const PLUGIN_NAME = "deploy";

/**
 * Maps the manifest's public redirects to deploy-friendly redirects. Only
 * `manifest.publicRedirects` is read: `manifest.redirects` also contains
 * non-public paths, which must never leak into deploy files. A redirect whose
 * target slug no longer exists is skipped and reported as a diagnostic.
 */
export function resolvePublicRedirects(
  manifest: ContentManifest,
  diagnostics: Diagnostic[],
): PublicRedirect[] {
  const redirects: PublicRedirect[] = [];
  for (const [from, redirect] of manifest.publicRedirects) {
    const target = manifest.bySlug.get(redirect.slug)?.permalink;
    if (!target) {
      diagnostics.push({
        code: "deploy-unresolved-redirect",
        severity: "warning",
        pluginName: PLUGIN_NAME,
        message: `Redirect "${from}" points to unknown slug "${redirect.slug}"; skipping deploy redirect.`,
        slug: redirect.slug,
        target: from,
      });
      continue;
    }
    redirects.push({ from, to: target, status: redirect.status });
  }
  return redirects;
}

/**
 * Prepares static hosting files for one or more deploy targets. The plugin only
 * plans and emits files through the build's generated-output sink; it never
 * writes to the filesystem and never uploads anything.
 */
export function deployPlugin(options: DeployOptions): RiebeckitePlugin {
  return definePlugin({
    name: PLUGIN_NAME,
    options,
    onBuildEnd(context) {
      const redirects = resolvePublicRedirects(
        context.manifest,
        context.diagnostics,
      );
      const providers = Array.isArray(options.provider)
        ? options.provider
        : [options.provider];
      const outputs = mergePlannedOutputs(
        providers.map((provider) =>
          planDeployOutputs({ provider, redirects, options }),
        ),
      );
      for (const entry of outputs) {
        context.output.emit(entry);
      }
    },
  });
}
