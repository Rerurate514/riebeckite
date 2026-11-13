import type { PluginEndpoint, PluginEndpointResponse } from "@riebeckite/core";
import { REACTION_TYPES, type ResolvedReactionsOptions } from "./types.js";

export function createReactionsEndpoints(
  options: ResolvedReactionsOptions,
): PluginEndpoint[] {
  const resolveVisitorKey = options.resolveVisitorKey;
  if (!options.endpoint || !resolveVisitorKey) return [];

  return [
    {
      path: options.endpoint,
      method: "GET",
      handler: async ({ manifest, request }) => {
        const contentId = request.query.contentId;
        if (!isManifestContentId(manifest.publicEntries, contentId)) {
          return badRequest("Unknown content ID.");
        }
        const visitorKey = (await resolveVisitorKey(request))?.trim();
        if (!visitorKey) return unauthorized();
        return {
          json: await options.provider.getReactions(contentId, visitorKey),
        };
      },
    },
    {
      path: options.endpoint,
      method: "POST",
      handler: async ({ manifest, request }) => {
        const input = parseRequest(request.body);
        if (
          !input ||
          !isManifestContentId(manifest.publicEntries, input.contentId)
        ) {
          return badRequest("Invalid reaction request.");
        }
        const visitorKey = (await resolveVisitorKey(request))?.trim();
        if (!visitorKey) return unauthorized();
        const data =
          input.action === "add"
            ? await options.provider.addReaction(
                input.contentId,
                input.type,
                visitorKey,
              )
            : await options.provider.removeReaction(
                input.contentId,
                input.type,
                visitorKey,
              );
        return { json: data };
      },
    },
  ];
}

type ReactionRequest = {
  contentId: string;
  type: (typeof REACTION_TYPES)[number];
  action: "add" | "remove";
};

function parseRequest(body: string): ReactionRequest | undefined {
  try {
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== "object") return undefined;
    const input = value as Record<string, unknown>;
    if (
      typeof input.contentId !== "string" ||
      !(REACTION_TYPES as readonly string[]).includes(input.type as string) ||
      (input.action !== "add" && input.action !== "remove")
    )
      return undefined;
    return input as ReactionRequest;
  } catch {
    return undefined;
  }
}

function isManifestContentId(
  entries: readonly { contentId?: string }[],
  contentId: string | undefined,
): contentId is string {
  return (
    contentId !== undefined &&
    entries.some((entry) => entry.contentId === contentId)
  );
}

function badRequest(message: string): PluginEndpointResponse {
  return { status: 400, json: { error: message } };
}

function unauthorized(): PluginEndpointResponse {
  return { status: 401, json: { error: "Visitor identity is required." } };
}
