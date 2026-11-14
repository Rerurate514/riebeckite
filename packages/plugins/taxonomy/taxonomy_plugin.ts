import {
  createStyleAsset,
  definePlugin,
  type OutputDependency,
  type PlannedGeneratedOutput,
} from "@riebeckite/core";
import { renderTermFeed } from "./src/feeds.js";
import { resolveTaxonomyOptions } from "./src/options.js";
import { renderTaxonomyIndexPage, renderTaxonomyPage } from "./src/pages.js";
import type { TaxonomyOptions } from "./src/types.js";
import { TAXONOMY_PLUGIN_NAME } from "./taxonomy_constants.js";
import { createTaxonomyEndpoints } from "./taxonomy_endpoints.js";
import {
  findTaxonomyModel,
  resolveTaxonomyIndexPath,
  taxonomyModels,
} from "./taxonomy_model.js";
import {
  enabledFormats,
  feedFilePath,
  validateTaxonomyOptions,
} from "./taxonomy_options.js";
import {
  pageProjectionDependencies,
  taxonomyOutputDependencies,
  taxonomyPageOutputDependencies,
} from "./taxonomy_output.js";

export function taxonomy(options: TaxonomyOptions = {}) {
  const resolved = resolveTaxonomyOptions(options);
  return definePlugin({
    name: TAXONOMY_PLUGIN_NAME,
    options,
    validateOptions: validateTaxonomyOptions,
    endpoints: createTaxonomyEndpoints(resolved),
    pageTypes: [
      {
        id: "taxonomy-term",
        paths: ({ manifest, config }) =>
          taxonomyModels(manifest, resolved, config).flatMap((model) =>
            [...model.index.tags, ...model.index.folders].map(
              (term) => term.path,
            ),
          ),
        outputDependencies: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          return model?.term
            ? taxonomyPageOutputDependencies(model.term, resolved.related)
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          if (!model?.term) return null;
          const page = renderTaxonomyPage(model.term, resolved);
          return {
            type: "taxonomy-term",
            layout: resolved.layout,
            pathname: model.term.path,
            title: page.title,
            body: page.html,
            headTags: page.headTags,
            language: model.model.locale,
          };
        },
        resolveRoute: ({ manifest, pathname, config }) => {
          const model = findTaxonomyModel(
            taxonomyModels(manifest, resolved, config),
            pathname,
          );
          if (!model?.term) return null;
          const page = renderTaxonomyPage(model.term, resolved);
          return {
            type: "taxonomy-term",
            layout: resolved.layout,
            pathname: model.term.path,
            title: page.title,
            body: page.html,
            headTags: page.headTags,
            language: model.model.locale,
          };
        },
      },
      {
        id: "taxonomy-index",
        paths: ({ manifest, config }) =>
          taxonomyModels(manifest, resolved, config).flatMap((model) => [
            ...(model.tagIndexPath ? [model.tagIndexPath] : []),
            ...(model.folderIndexPath ? [model.folderIndexPath] : []),
          ]),
        outputDependencies: ({ pathname, manifest, config }) => {
          const kind = resolveTaxonomyIndexPath(
            pathname,
            taxonomyModels(manifest, resolved, config),
          );
          const dependency: OutputDependency | undefined =
            kind === "tag"
              ? { type: "projection" as const, projection: "taxonomy-tags" }
              : kind === "folder"
                ? {
                    type: "projection" as const,
                    projection: "taxonomy-folders",
                  }
                : undefined;
          return dependency
            ? [...pageProjectionDependencies, dependency]
            : [{ type: "unknown" }];
        },
        resolve: ({ manifest, pathname, config }) => {
          const models = taxonomyModels(manifest, resolved, config);
          const kind = resolveTaxonomyIndexPath(pathname, models);
          if (!kind) return null;
          const model = models.find((candidate) =>
            kind === "tag"
              ? candidate.tagIndexPath === pathname
              : candidate.folderIndexPath === pathname,
          );
          if (!model) return null;
          const page = renderTaxonomyIndexPage(
            kind,
            kind === "tag" ? model.index.tags : model.index.folders,
            resolved,
          );
          return {
            type: "taxonomy-index",
            layout: resolved.layout,
            pathname,
            title: page.title,
            body: page.html,
            language: model.locale,
          };
        },
        resolveRoute: ({ manifest, pathname, config }) => {
          const models = taxonomyModels(manifest, resolved, config);
          const kind = resolveTaxonomyIndexPath(pathname, models);
          if (!kind) return null;
          const model = models.find((candidate) =>
            kind === "tag"
              ? candidate.tagIndexPath === pathname
              : candidate.folderIndexPath === pathname,
          );
          if (!model) return null;
          const page = renderTaxonomyIndexPage(
            kind,
            kind === "tag" ? model.index.tags : model.index.folders,
            resolved,
          );
          return {
            type: "taxonomy-index",
            layout: resolved.layout,
            pathname,
            title: page.title,
            body: page.html,
            language: model.locale,
          };
        },
      },
    ],
    planGeneratedOutputs(context) {
      if (!context.site) return [];
      const models = taxonomyModels(context.manifest, resolved, {
        site: context.site,
      });
      const outputs: PlannedGeneratedOutput[] = [];
      for (const model of models) {
        for (const term of [...model.index.tags, ...model.index.folders]) {
          for (const format of enabledFormats(resolved)) {
            const path = feedFilePath(term.path, format);
            outputs.push({
              path,
              content: renderTermFeed(
                { site: context.site },
                term,
                format,
                resolved.feedLimit,
              ),
              dependencies: taxonomyOutputDependencies(term),
            });
          }
        }
      }
      return outputs;
    },
    assets: [
      createStyleAsset(
        TAXONOMY_PLUGIN_NAME,
        "@riebeckite/plugin-taxonomy/style.css",
      ),
    ],
  });
}
