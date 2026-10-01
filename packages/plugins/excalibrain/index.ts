import {
  type ContentManifest,
  createClientEntry,
  createStyleAsset,
  definePlugin,
  type PostContent,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { buildExcaliBrainGraph } from "./src/graph.js";
import { layoutExcaliBrain } from "./src/layout.js";
import {
  resolveExcaliBrainOptions,
  validateExcaliBrainOptions,
} from "./src/options.js";
import {
  hasExcaliBrainPlaceholder,
  replaceExcaliBrainPlaceholders,
} from "./src/placeholder.js";
import { rehypeExcaliBrain } from "./src/rehype.js";
import { renderExcaliBrainSection } from "./src/render.js";
import type { ExcaliBrainOptions } from "./src/types.js";

export { buildExcaliBrainGraph } from "./src/graph.js";
export { layoutExcaliBrain } from "./src/layout.js";
export type {
  DefinedRelation,
  ResolvedOntology,
} from "./src/ontology.js";
export {
  collectDefinedRelations,
  DEFAULT_ONTOLOGY,
  isNoteHidden,
  normalizeFieldName,
  resolveOntology,
} from "./src/ontology.js";
export type { ResolvedExcaliBrainOptions } from "./src/options.js";
export {
  resolveExcaliBrainOptions,
  validateExcaliBrainOptions,
} from "./src/options.js";
export {
  renderExcaliBrainSection,
  renderExcaliBrainSvg,
} from "./src/render.js";
export type {
  ExcaliBrainBuildInput,
  ExcaliBrainClientOptions,
  ExcaliBrainGraph,
  ExcaliBrainLayout,
  ExcaliBrainLink,
  ExcaliBrainNode,
  ExcaliBrainNodeRole,
  ExcaliBrainOntology,
  ExcaliBrainOptions,
  ExcaliBrainPositionedLink,
  ExcaliBrainPositionedNode,
  ExcaliBrainRegion,
  ExcaliBrainRelationType,
  ExcaliBrainRenderMode,
  ExcaliBrainRole,
} from "./src/types.js";

const SECTION_ATTRIBUTE = "data-excalibrain";

type TrackedNote = {
  markdown: string;
  content: PostContent;
};

function createExcaliBrainRuntime(options: ExcaliBrainOptions) {
  const notes = new Map<string, TrackedNote>();
  const resolved = resolveExcaliBrainOptions(options);

  return {
    track(slug: string, markdown: string, content: PostContent): void {
      notes.set(slug, { markdown, content });
    },
    resolve(
      manifest: ContentManifest,
      _config?: ResolvedRiebeckiteConfig,
    ): void {
      for (const entry of manifest.publicEntries) {
        const note = notes.get(entry.slug);
        const markdown = note?.markdown ?? "";

        const graph = buildExcaliBrainGraph({
          slug: entry.slug,
          frontmatter: entry.frontmatter,
          markdown,
          manifest,
          options,
        });
        const layout = layoutExcaliBrain(graph, options);
        const hasNeighbour = graph.nodes.length > 0;
        const hasFence = hasExcaliBrainPlaceholder(entry.html);

        if (!hasFence && !(resolved.auto && hasNeighbour)) continue;
        if (!hasFence && entry.html.includes(SECTION_ATTRIBUTE)) continue;

        const section = renderExcaliBrainSection({
          graph,
          layout,
          options,
          render: resolved.render,
        });

        if (hasFence) {
          entry.html = replaceExcaliBrainPlaceholders(entry.html, section);
          if (note) {
            note.content.html = replaceExcaliBrainPlaceholders(
              note.content.html,
              section,
            );
          }
        } else {
          entry.html = `${entry.html}${section}`;
          if (note) note.content.html = `${note.content.html}${section}`;
        }
      }
    },
  };
}

export function excaliBrain(options: ExcaliBrainOptions = {}) {
  const runtime = createExcaliBrainRuntime(options);
  const language = options.language ?? "excalibrain";

  return definePlugin({
    name: "excalibrain",
    order: -10,
    options,
    validateOptions: validateExcaliBrainOptions,
    extendHtmlPipeline: (pipeline) => {
      pipeline.use(rehypeExcaliBrain, { language });
    },
    onPostParsed: (context) => {
      runtime.track(context.slug, context.markdown, context.content);
    },
    onManifestCreated: (context) => {
      runtime.resolve(context.manifest, context.config);
    },
    assets: [createStyleAsset("excalibrain")],
    clientEntries: [createClientEntry("excalibrain", "initExcaliBrain")],
  });
}

export const excaliBrainPlugin = excaliBrain;
