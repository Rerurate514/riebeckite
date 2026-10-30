import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeTimeline } from "./src/rehype.js";
import { remarkTimeline } from "./src/remark.js";
import {
  buildTimeline,
  renderTimelinePage,
  resolveTimelineOptions,
} from "./src/timeline.js";
import type { TimelineOptions } from "./src/types.js";

export { rehypeTimeline } from "./src/rehype.js";
export { parseInlineTimeline, remarkTimeline } from "./src/remark.js";
export {
  buildTimeline,
  DEFAULT_TIMELINE_BASE_PATH,
  DEFAULT_TIMELINE_CLASS_NAME,
  DEFAULT_TIMELINE_KEY,
  renderTimelinePage,
  resolveTimelineOptions,
} from "./src/timeline.js";
export type {
  InlineTimeline,
  InlineTimelineEvent,
  ResolvedTimelineOptions,
  TimelineEntry,
  TimelineOptions,
  TimelineSelector,
} from "./src/types.js";

export const TIMELINE_PLUGIN_NAME = "timeline";

export function timeline(options: TimelineOptions = {}) {
  const resolved = resolveTimelineOptions(options);
  return definePlugin({
    name: TIMELINE_PLUGIN_NAME,
    options,
    order: -30,
    processedContentCache: {
      version: "timeline-v2",
      dependencyMode: "none",
    },
    assets: [
      createStyleAsset("timeline", "@riebeckite/plugin-timeline/style.css"),
    ],
    validateOptions: validateTimelineOptions,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(remarkTimeline);
    },
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeTimeline);
    },
    pageTypes: [
      {
        id: "timeline",
        paths: ({ manifest, contentIndex }) =>
          resolved.basePath === "" ||
          buildTimeline(manifest.discoverableEntries, resolved, contentIndex)
            .length === 0
            ? []
            : [resolved.basePath],
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname, contentIndex }) => {
          if (pathname !== resolved.basePath || resolved.basePath === "")
            return null;
          const entries = buildTimeline(
            manifest.discoverableEntries,
            resolved,
            contentIndex,
          );
          if (entries.length === 0) return null;
          const page = renderTimelinePage(entries, resolved);
          return {
            type: "timeline",
            pathname,
            title: page.title,
            body: page.html,
          };
        },
        resolveRoute: ({ manifest, pathname, contentIndex }) => {
          if (pathname !== resolved.basePath || resolved.basePath === "")
            return null;
          const entries = buildTimeline(
            manifest.discoverableEntries,
            resolved,
            contentIndex,
          );
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
  if (
    options.selection !== undefined &&
    options.selection !== "automatic" &&
    options.selection !== "marked"
  ) {
    issues.push({
      path: "selection",
      message: 'Expected "automatic" or "marked".',
    });
  }
  for (const key of ["include", "exclude"] as const) {
    const selector = options[key];
    if (!selector) continue;
    const values = [selector.folders, selector.tags];
    if (!values.some((value) => Array.isArray(value) && value.length > 0)) {
      issues.push({
        path: key,
        message: "Expected at least one folder or tag.",
      });
    }
    for (const property of ["folders", "tags"] as const) {
      const value = selector[property];
      if (
        value !== undefined &&
        (!Array.isArray(value) ||
          value.some((item) => typeof item !== "string" || item.trim() === ""))
      ) {
        issues.push({
          path: `${key}.${property}`,
          message: "Expected an array of non-empty strings.",
        });
      }
    }
  }
  return issues;
}
