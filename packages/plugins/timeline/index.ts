import {
  type ConfigValidationIssue,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import { rehypeTimeline } from "./src/rehype.js";
import { remarkTimeline } from "./src/remark.js";
import {
  buildTimelinePages,
  renderTimelinePage,
  resolveTimelineOptions,
} from "./src/timeline.js";
import type { TimelineOptions } from "./src/types.js";

export { rehypeTimeline } from "./src/rehype.js";
export { parseInlineTimeline, remarkTimeline } from "./src/remark.js";
export {
  buildTimeline,
  buildTimelinePages,
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
          buildTimelinePages(manifest, resolved, contentIndex).map(
            (page) => page.pathname,
          ),
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname, contentIndex }) => {
          const page = buildTimelinePages(
            manifest,
            resolved,
            contentIndex,
          ).find((candidate) => candidate.pathname === pathname);
          if (!page) return null;
          const rendered = renderTimelinePage(
            page.entries,
            resolved,
            page.locale,
          );
          return {
            type: "timeline",
            layout: resolved.layout,
            pathname: page.pathname,
            title: rendered.title,
            body: rendered.html,
            ...(page.locale ? { language: page.locale } : {}),
          };
        },
        resolveRoute: ({ manifest, pathname, contentIndex }) => {
          const page = buildTimelinePages(
            manifest,
            resolved,
            contentIndex,
          ).find((candidate) => candidate.pathname === pathname);
          if (!page) return null;
          const rendered = renderTimelinePage(
            page.entries,
            resolved,
            page.locale,
          );
          return {
            type: "timeline",
            layout: resolved.layout,
            pathname: page.pathname,
            title: rendered.title,
            body: rendered.html,
            ...(page.locale ? { language: page.locale } : {}),
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
  if (
    options.layout !== undefined &&
    options.layout !== "article" &&
    options.layout !== "wide"
  ) {
    issues.push({ path: "layout", message: 'Expected "article" or "wide".' });
  }
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
  if (
    options.localeMode !== undefined &&
    options.localeMode !== "current" &&
    options.localeMode !== "fallback" &&
    options.localeMode !== "all"
  ) {
    issues.push({
      path: "localeMode",
      message: 'Expected "current", "fallback", or "all".',
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
