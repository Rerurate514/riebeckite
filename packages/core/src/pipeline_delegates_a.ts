import type { ContentDependencyTracker } from "./content/content_dependency_tracker.js";
import type { PipelineContext } from "./pipeline_context.js";
import { executeWithEmbedStateImpl } from "./pipeline_methods_a.js";
import type { MarkdownExecutionContext } from "./types/plugin_pipeline.js";
import type { PostContent } from "./types/post_content.js";

export class PipelineDelegatesA {
  executeWithEmbedState = async (
    markDownContent: string,
    context: MarkdownExecutionContext,
    embedDepth: number,
    embedTrail: ReadonlySet<string>,
    rootDependencyTracker: ContentDependencyTracker | null,
  ): Promise<PostContent> =>
    await executeWithEmbedStateImpl(
      this as unknown as PipelineContext,
      markDownContent,
      context,
      embedDepth,
      embedTrail,
      rootDependencyTracker,
    );
}
