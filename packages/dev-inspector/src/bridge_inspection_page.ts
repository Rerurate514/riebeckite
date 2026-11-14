import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import { resolvePublicUrl } from "./bridge_inspection_publication.js";
import {
  isContentPath,
  resolveBridgeSource,
} from "./bridge_inspection_source.js";
import type { BridgeInspectionOptions } from "./bridge_inspection_types.js";

export function inspectBridgePage(
  snapshot: CompletedContentBuildSnapshot | undefined,
  input: string | null,
  options: BridgeInspectionOptions,
): Record<string, unknown> {
  if (!input || !isContentPath(input)) return { status: "invalid-source" };
  const resolved = resolveBridgeSource(snapshot, input, options);
  if (resolved.status === "unavailable") return { status: "unavailable" };
  if (resolved.status === "unsupported")
    return {
      status: "unsupported",
      source: input,
      reason: resolved.reason,
      candidates: resolved.candidates,
    };
  if (resolved.status !== "resolved" || !snapshot)
    return { status: "not-found", source: input };
  const entry = snapshot.manifest.bySlug.get(
    (resolved.entry as { slug: string }).slug,
  );
  if (!entry) return { status: "unavailable" };
  return {
    status: "resolved",
    source: input,
    page: entry.permalink,
    visibility: entry.publishing.visibility,
    routable: entry.publishing.routable,
    discoverable: entry.publishing.discoverable,
    locale: entry.publicLocation.language ?? null,
    publishAt: entry.publishing.publishAt?.toISOString() ?? null,
    revision: options.revision,
    productionUrl: resolvePublicUrl(options.publicOrigin, entry.permalink),
  };
}
