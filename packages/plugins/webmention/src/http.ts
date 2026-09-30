import type { PluginEndpointResponse } from "@riebeckite/core";

/** JSON endpoint response with an explicit content type. */
export function jsonResponse(
  status: number,
  value: unknown,
): PluginEndpointResponse {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    json: value,
  };
}

/** A structured, non-throwing error body shared by receive and feed. */
export function errorResponse(
  status: number,
  error: string,
): PluginEndpointResponse {
  return jsonResponse(status, { error });
}
