import type { GraphQuery, PluginExecutionQuery } from "@riebeckite/core";
import { nonNegativeInteger } from "./development_inspector_query_output.js";

export function graphQueryFromRequest(url: string | undefined): GraphQuery {
  const parameters = new URL(
    url ?? "/__riebeckite/inspector/graph",
    "http://localhost",
  ).searchParams;
  return {
    node: parameters.get("node") ?? undefined,
    query: parameters.get("q") ?? "",
    kind: parameters.get("kind") ?? undefined,
    direction:
      parameters.get("direction") === "in" ||
      parameters.get("direction") === "out"
        ? (parameters.get("direction") as "in" | "out")
        : "both",
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: Math.min(
      100,
      Math.max(1, nonNegativeInteger(parameters.get("limit"), 40)),
    ),
  };
}

export function pluginExecutionQueryFromRequest(
  url: string | undefined,
): PluginExecutionQuery {
  const parameters = new URL(
    url ?? "/__riebeckite/inspector/plugins",
    "http://localhost",
  ).searchParams;
  return {
    query: parameters.get("q") ?? "",
    plugin: parameters.get("plugin") ?? undefined,
    sort: parameters.get("sort") === "name" ? "name" : "duration",
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: Math.min(
      100,
      Math.max(1, nonNegativeInteger(parameters.get("limit"), 100)),
    ),
  };
}
