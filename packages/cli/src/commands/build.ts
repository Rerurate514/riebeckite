import type {
  ContentManifest,
  Observability,
  OutputChangeSet,
} from "@riebeckite/core";
import {
  ConsoleLogger,
  ContentManager,
  NoopTracer,
  publicationEntriesFromManifest,
  publicationFingerprint,
  publicationRedirectsFromManifest,
} from "@riebeckite/core";
import type { NoChangeFastPathOutputMetrics } from "@riebeckite/honox";
import {
  buildHonoxApplication,
  createNoChangeFastPathOutputMetrics,
  verifyNoChangeFastPath,
} from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import {
  clearBuildOutputMarker,
  writeBuildOutputMarker,
} from "../build_output.js";
import { resolveProjectContentSource } from "../content_source.js";
import { loadProjectConfig } from "../load_config.js";
import { FastPathSpanCollector } from "./fast_path_metrics.js";

function formatDuration(durationMs: number): string {
  if (durationMs < 1_000) return `${Math.round(durationMs)}ms`;
  return `${(durationMs / 1_000).toFixed(2)}s`;
}

const contentTimingSpans: readonly (readonly [string, string])[] = [
  ["content.scan", "scan"],
  ["content.process", "process"],
  ["content.markdown", "markdown"],
  ["content.manifest", "manifest"],
  ["content.graph", "graph"],
];

function contentProcessingSummary(collector: FastPathSpanCollector): string {
  const total = formatDuration(collector.durationMs("content.build"));
  const parts = contentTimingSpans
    .map(([span, label]) => {
      const duration = collector.durationMs(span);
      if (duration <= 0) return undefined;
      const calls = collector.calls(span);
      const suffix = calls > 1 ? ` cumulative (${calls} calls)` : "";
      return `${label} ${formatDuration(duration)}${suffix}`;
    })
    .filter((part): part is string => part !== undefined);
  return parts.length === 0
    ? `Content processing: ${total}`
    : `Content processing: ${total} (inclusive: ${parts.join(" · ")})`;
}

export async function runBuild(
  project: RiebeckiteProject,
  options: {
    full: boolean;
    observability?: Observability;
    publishingBuildTime?: Date | string;
  },
): Promise<void> {
  const baseObservability = options.observability ?? {
    logger: new ConsoleLogger(),
    tracer: new NoopTracer(),
  };
  const spanCollector = new FastPathSpanCollector(baseObservability.tracer);
  const observability: Observability = {
    logger: baseObservability.logger,
    tracer: spanCollector,
  };
  const outputMetrics = createNoChangeFastPathOutputMetrics();
  const startedAt = performance.now();
  await observability.tracer.span("build.total", {}, async () => {
    const config = await loadProjectConfig(project);
    const persistentContentCache = { hits: 0, misses: 0, bypasses: 0 };
    const content = new ContentManager(
      resolveProjectContentSource(config, project),
      config.content.exclude,
      {
        config,
        observability,
        commitBuildState: false,
        ...(options.publishingBuildTime === undefined
          ? {}
          : { publishingBuildTime: options.publishingBuildTime }),
        onPersistentContentCacheResult: (result) => {
          if (result === "hit") persistentContentCache.hits += 1;
          else if (result === "miss") persistentContentCache.misses += 1;
          else persistentContentCache.bypasses += 1;
        },
      },
    );

    let manifest: ContentManifest | null = null;
    let fastPathBlockReason: string | undefined;
    const rssBeforeBytes = process.memoryUsage().rss;
    const fastPathDecisionStartedAt = performance.now();
    let fastPathUsed = false;
    let pluginValidationDurationMs = 0;
    try {
      manifest = await observability.tracer.span(
        "content.build",
        {},
        async () => {
          const outputChangeSet = options.full
            ? undefined
            : await content.getOutputChangeSet({ incremental: true });
          let pluginBlockReason: string | undefined;
          if (!options.full) {
            const pluginValidationStartedAt = performance.now();
            try {
              pluginBlockReason = await content.getNoChangeFastPathBlockReason({
                incremental: true,
              });
            } finally {
              pluginValidationDurationMs =
                performance.now() - pluginValidationStartedAt;
            }
          }
          const fastPath = await evaluateNoChangeFastPath(
            project,
            outputChangeSet,
            pluginBlockReason,
            outputMetrics,
          );
          fastPathBlockReason = fastPath.blockReason;
          fastPathUsed = fastPath.used;
          const rssAfterBytes = process.memoryUsage().rss;
          observability.tracer.event("build.fast-path", {
            fastPathEligible: fastPath.eligible,
            fastPathUsed,
            fastPathBlockReason: fastPathBlockReason ?? "",
            fastPathDecisionDurationMs:
              performance.now() - fastPathDecisionStartedAt,
            viteStartupSkipped: fastPathUsed,
            ssgSkipped: fastPathUsed,
            buildStateReadDurationMs: spanCollector.durationMs(
              "content.build-state.load",
            ),
            contentPlanDurationMs: spanCollector.planDurationMs(),
            externalDependencyDurationMs: spanCollector.durationMs(
              "external.dependencies.resolve",
            ),
            pluginValidationDurationMs,
            outputInventoryValidationDurationMs:
              outputMetrics.outputInventoryValidationDurationMs,
            outputHashValidationDurationMs:
              outputMetrics.outputHashValidationDurationMs,
            outputFilesHashed: outputMetrics.outputFilesHashed,
            outputBytesHashed: outputMetrics.outputBytesHashed,
            rssBeforeBytes,
            rssAfterBytes,
            peakRssBytes: Math.max(rssBeforeBytes, rssAfterBytes),
          });
          if (!fastPathUsed)
            return await content.build({ incremental: !options.full });
          return null;
        },
      );
    } finally {
      await content.dispose();
    }

    observability.logger.info(
      `Content: ${manifest?.entries.length ?? 0} total · ${content.getProcessedContentCount()} processed · ${content.getReusedContentCount()} reused`,
    );
    observability.logger.info(contentProcessingSummary(spanCollector));
    observability.logger.info(
      `Persistent content cache: ${persistentContentCache.hits} hits · ${persistentContentCache.misses} misses · ${persistentContentCache.bypasses} bypasses`,
    );

    if (fastPathUsed) {
      observability.logger.info("No-change fast path: Vite and SSG skipped.");
    } else {
      await clearBuildOutputMarker(project);
      await buildHonoxApplication({
        root: project.appRoot,
        tracer: observability.tracer,
      });
      await writeBuildOutputMarker(project, {
        completedAt: new Date(),
        ...(manifest === null
          ? {}
          : {
              publicationFingerprint: publicationFingerprint(
                publicationEntriesFromManifest(manifest),
                publicationRedirectsFromManifest(manifest),
              ),
            }),
      });
    }
  });
  observability.logger.info(
    `Build complete in ${formatDuration(performance.now() - startedAt)}`,
  );
}

async function evaluateNoChangeFastPath(
  project: RiebeckiteProject,
  outputChangeSet: OutputChangeSet | undefined,
  pluginBlockReason: string | undefined,
  outputMetrics: NoChangeFastPathOutputMetrics,
): Promise<{
  readonly eligible: boolean;
  readonly used: boolean;
  readonly blockReason?: string;
}> {
  if (!outputChangeSet) {
    return {
      eligible: false,
      used: false,
      blockReason: "full-build-requested",
    };
  }
  if (outputChangeSet.fullRegenerationRequired) {
    return {
      eligible: false,
      used: false,
      blockReason: "unsafe-output-dependency",
    };
  }
  if (
    outputChangeSet.affected.length > 0 ||
    outputChangeSet.removed.length > 0
  ) {
    return {
      eligible: false,
      used: false,
      blockReason: "content-or-output-changed",
    };
  }
  if (pluginBlockReason) {
    return { eligible: false, used: false, blockReason: pluginBlockReason };
  }
  const verification = await verifyNoChangeFastPath({
    root: project.appRoot,
    outputDirectory:
      project.config.outputDirectory ?? `${project.appRoot}/dist`,
    expectedOutputPaths: outputChangeSet.unchanged.map((output) => output.path),
    metrics: outputMetrics,
  });
  return {
    eligible: verification.used,
    used: verification.used,
    blockReason: verification.blockReason,
  };
}
