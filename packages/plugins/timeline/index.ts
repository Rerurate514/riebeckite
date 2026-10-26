import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  buildTimeline,
  renderTimelinePage,
  resolveTimelineOptions,
} from "./src/timeline.js";
import type { TimelineOptions } from "./src/types.js";

export {
  buildTimeline,
  DEFAULT_TIMELINE_BASE_PATH,
  DEFAULT_TIMELINE_CLASS_NAME,
  DEFAULT_TIMELINE_KEY,
  renderTimelinePage,
  resolveTimelineOptions,
} from "./src/timeline.js";
export type {
  ResolvedTimelineOptions,
  TimelineEntry,
  TimelineOptions,
} from "./src/types.js";

export const TIMELINE_PLUGIN_NAME = "timeline";

export function timeline(options: TimelineOptions = {}) {
  const resolved = resolveTimelineOptions(options);
  return definePlugin({
    name: TIMELINE_PLUGIN_NAME,
    options,
    assets: [
      createStyleAsset("timeline", "@riebeckite/plugin-timeline/style.css"),
    ],
    validateOptions: validateTimelineOptions,
    pageTypes: [
      {
        id: "timeline",
        paths: ({ manifest }) =>
          resolved.basePath === "" ||
          buildTimeline(manifest.discoverableEntries, resolved).length === 0
            ? []
            : [resolved.basePath],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          if (pathname !== resolved.basePath || resolved.basePath === "")
            return null;
          const entries = buildTimeline(manifest.discoverableEntries, resolved);
          if (entries.length === 0) return null;
          const page = renderTimelinePage(entries, resolved);
          return {
            type: "timeline",
            pathname,
            title: page.title,
            body: page.html,
          };
        },
      },
    ],
  });
}

function validateTimelineOptions(
  options: TimelineOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  for (const key of ["basePath", "className", "key", "title"] as const) {
    const value = options[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.trim() === "")
    ) {
      issues.push({ path: key, message: "Expected a non-empty string." });
    }
  }
  return issues;
}
