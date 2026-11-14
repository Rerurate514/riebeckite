import type {
  OutputChangeReason,
  OutputDependency,
  OutputDescriptor,
} from "@riebeckite/core";
import {
  listedOutputLimit,
  maximumListedOutputLimit,
  outputPath,
} from "./development_inspector_paths.js";
import type {
  ListedOutput,
  OutputLookups,
  OutputQuery,
  OutputResult,
} from "./development_inspector_types.js";

export function outputQueryFromRequest(url: string | undefined): OutputQuery {
  const parameters = new URL(url ?? outputPath, "http://localhost")
    .searchParams;
  return {
    page: nonNegativeInteger(parameters.get("page"), 0),
    limit: pageLimit(parameters.get("limit")),
    query: parameters.get("q") ?? "",
    kind: parameters.get("kind") ?? undefined,
    status: parameters.get("status") ?? "all",
    changed: normalizeChangedTarget(parameters.get("changed")),
    output: parameters.get("output") ?? undefined,
    dependencyPage: nonNegativeInteger(parameters.get("dpage"), 0),
    dependencyLimit: pageLimit(parameters.get("dlimit")),
    dependencyQuery: parameters.get("dq") ?? "",
    dependencyKind: parameters.get("dkind") ?? undefined,
  };
}

export function normalizeChangedTarget(
  value: string | null,
): string | undefined {
  if (!value) return undefined;
  return value.replace(/^content:/, "");
}

export function nonNegativeInteger(
  value: string | null,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function pageLimit(value: string | null): number {
  const parsed = nonNegativeInteger(value, listedOutputLimit);
  return Math.min(
    maximumListedOutputLimit,
    Math.max(1, parsed || listedOutputLimit),
  );
}

export function pageOf<T>(
  values: readonly T[],
  page: number,
  limit: number,
): { items: readonly T[]; hidden: number; total: number } {
  const start = page * limit;
  return {
    items: values.slice(start, start + limit),
    hidden: Math.max(0, values.length - start - limit),
    total: values.length,
  };
}

export function outputMatches(
  output: OutputDescriptor,
  query: OutputQuery,
  reason: OutputChangeReason | undefined,
): boolean {
  if (query.kind && output.kind !== query.kind) return false;
  if (query.changed) {
    if (reason?.type !== "content" || reason.slug !== query.changed)
      return false;
  }
  return matchesText(
    [output.path, output.kind, output.producer, reasonLabel(reason)],
    query.query,
  );
}

export function dependencyMatches(
  output: OutputDescriptor,
  query: OutputQuery,
): boolean {
  if (output.dependencies.length === 0) return false;
  if (
    query.dependencyKind &&
    !output.dependencies.some(
      (dependency) => dependency.type === query.dependencyKind,
    )
  ) {
    return false;
  }
  const labels = output.dependencies.map(dependencyLabel);
  if (query.changed && !labels.includes(`content:${query.changed}`)) {
    return false;
  }
  return matchesText(
    [output.path, output.kind, ...labels],
    query.dependencyQuery,
  );
}

export function matchesText(
  values: readonly (string | undefined)[],
  query: string,
) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

export function outputLookups(
  result: OutputResult,
  query: OutputQuery,
): OutputLookups {
  const allOutputs = [...result.affected, ...result.unchanged];
  const lookups: {
    output?: OutputLookups["output"];
    changed?: OutputLookups["changed"];
  } = {};
  if (query.output) {
    const selected = allOutputs.find((output) => output.path === query.output);
    if (!selected) {
      lookups.output = { status: "not-found", target: query.output };
    } else {
      const labels = new Set<string>(
        selected.dependencies.map(dependencyLabel),
      );
      const related = allOutputs.filter(
        (output) =>
          output.path !== selected.path &&
          output.dependencies.some((dependency) =>
            labels.has(dependencyLabel(dependency)),
          ),
      );
      const page = pageOf(related, query.page, query.limit);
      lookups.output = {
        status: "found",
        target: query.output,
        output: listedOutput(selected),
        dependencies: [...labels],
        relatedOutputs: page.items.map((output) => listedOutput(output)),
        hiddenRelatedCount: page.hidden,
      };
    }
  }
  if (query.changed) {
    const target = query.changed;
    const outputs = result.affected.filter((output) => {
      const reason = result.reasons.get(output.path);
      return (
        (reason?.type === "content" && reason.slug === target) ||
        output.dependencies.some(
          (dependency) =>
            dependency.type === "content" && dependency.slug === target,
        )
      );
    });
    const page = pageOf(outputs, query.page, query.limit);
    lookups.changed = {
      target,
      outputCount: outputs.length,
      outputs: page.items.map((output) =>
        listedOutput(output, result.reasons.get(output.path)),
      ),
      hiddenOutputCount: page.hidden,
    };
  }
  return lookups;
}

export function listedOutput(
  output: OutputDescriptor,
  reason?: OutputChangeReason | string,
): ListedOutput {
  const label = typeof reason === "string" ? reason : reasonLabel(reason);
  return {
    path: output.path,
    kind: output.kind,
    producer: output.producer,
    ...(label ? { reason: label } : {}),
  };
}

export function reasonLabel(
  reason: OutputChangeReason | undefined,
): string | undefined {
  if (!reason) return undefined;
  switch (reason.type) {
    case "new-output":
      return "new output";
    case "kind-changed":
      return `output kind changed from ${reason.previousKind}`;
    case "unknown-dependency":
      return "unknown dependency";
    case "external":
      return `external:${reason.id} changed`;
    case "derived-view":
      return `derived-view:${reason.id} changed`;
    case "derived-query":
      return `derived-query:${reason.id} changed`;
    case "global":
      return "global dependency changed";
    case "content":
      return `content:${reason.slug} changed`;
    case "tag":
      return `tag:${reason.tag} changed`;
    case "folder":
      return `folder:${reason.folder} changed`;
    case "file":
      return `file:${reason.path} changed`;
    case "public-location":
      return `public-location:${reason.pathname} changed`;
    case "content-query":
      return `content-query:${reason.properties.join(",")}${
        reason.unknown ? "?" : ""
      } changed`;
    case "projection":
      return `projection:${reason.projection} changed`;
  }
}

export function dependencyLabel(dependency: OutputDependency): string {
  switch (dependency.type) {
    case "content":
      return `content:${dependency.slug}`;
    case "tag":
      return `tag:${dependency.tag}`;
    case "folder":
      return `folder:${dependency.folder}`;
    case "file":
      return `file:${dependency.path}`;
    case "public-location":
      return `public-location:${dependency.pathname}`;
    case "projection":
      return `projection:${dependency.projection}`;
    case "external":
      return `external:${dependency.id}`;
    case "derived-view":
      return `derived-view:${dependency.id}@${dependency.version}`;
    case "derived-query":
      return `derived-query:${dependency.id}@${dependency.fingerprint.slice(0, 8)}`;
    case "content-query":
      return `content-query:${dependency.properties.join(",")}${
        dependency.unknown ? "?" : ""
      }`;
    case "global":
      return "global";
    case "unknown":
      return "unknown";
  }
}
