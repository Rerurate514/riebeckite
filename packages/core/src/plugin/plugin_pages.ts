import type { OutputDescriptor } from "../content/output_dependency.js";
import type {
  ContentManifest,
  PluginPageRoute,
} from "../types/content_manifest.js";
import type { RiebeckitePlugin } from "../types/plugin.js";
import type {
  PluginPageType,
  ResolvedPluginPage,
} from "../types/plugin_page.js";
import type {
  PluginContextBase,
  PluginContextWithCache,
} from "./plugin_runtime_context.js";

type PluginPageResolverOptions = {
  readonly plugins: () => readonly RiebeckitePlugin[];
  readonly createContext: (
    contentIndex: Map<string, string>,
  ) => PluginContextBase;
  readonly createPluginContext: <TContext extends PluginContextBase>(
    plugin: RiebeckitePlugin,
    context: TContext,
  ) => PluginContextWithCache<TContext>;
  readonly renderMarkdown: (markdown: string) => Promise<string>;
};

type DeclaredPluginPage = {
  readonly pathname: string;
  readonly plugin: RiebeckitePlugin;
  readonly pageType: PluginPageType;
  readonly sourceSlugs?: readonly string[];
};

export class PluginPageResolver {
  private pageDeclarations = new WeakMap<
    ContentManifest,
    Promise<readonly DeclaredPluginPage[]>
  >();

  constructor(private readonly options: PluginPageResolverOptions) {}

  async resolvePage(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null> {
    const matches: { page: ResolvedPluginPage; priority: number }[] = [];
    const requestedPathname = normalizePagePath(pathname);
    for (const plugin of this.options.plugins()) {
      for (const pageType of plugin.pageTypes ?? []) {
        const pagePathname = normalizePageTypePath(pathname, pageType);
        const context = {
          ...this.options.createContext(contentIndex),
          manifest,
          pathname: pagePathname,
          renderMarkdown: this.options.renderMarkdown,
        };
        const page = await pageType.resolve(
          this.options.createPluginContext(plugin, context),
        );
        if (page) {
          matches.push({
            page: {
              ...page,
              pathname: pageType.directoryIndex
                ? normalizeDirectoryPagePath(page.pathname)
                : page.pathname,
              type: pageType.id,
              pluginName: plugin.name,
            },
            priority: pageType.priority ?? 0,
          });
        }
      }
    }
    if (matches.length === 0) return null;
    const highestPriority = Math.max(...matches.map((match) => match.priority));
    const highest = matches.filter(
      (match) => match.priority === highestPriority,
    );
    if (highest.length !== 1) {
      throw new Error(
        `Multiple plugin page types match ${requestedPathname} at priority ${highestPriority}: ${highest
          .map((match) => match.page.type)
          .join(", ")}`,
      );
    }
    return highest[0].page;
  }

  async resolveRoute(
    pathname: string,
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<ResolvedPluginPage | null | undefined> {
    const pageTypes = this.options
      .plugins()
      .flatMap((plugin) =>
        (plugin.pageTypes ?? []).map((pageType) => ({ plugin, pageType })),
      );
    if (pageTypes.some(({ pageType }) => !pageType.resolveRoute)) {
      return undefined;
    }

    const matches: { page: ResolvedPluginPage; priority: number }[] = [];
    const requestedPathname = normalizePagePath(pathname);
    for (const { plugin, pageType } of pageTypes) {
      const resolveRoute = pageType.resolveRoute;
      if (!resolveRoute) return undefined;
      const pagePathname = normalizePageTypePath(pathname, pageType);
      const context = {
        ...this.options.createContext(contentIndex),
        manifest,
        pathname: pagePathname,
        renderMarkdown: this.options.renderMarkdown,
      };
      const page = await resolveRoute(
        this.options.createPluginContext(plugin, context),
      );
      if (page) {
        matches.push({
          page: {
            ...page,
            pathname: pageType.directoryIndex
              ? normalizeDirectoryPagePath(page.pathname)
              : page.pathname,
            type: pageType.id,
            pluginName: plugin.name,
          },
          priority: pageType.priority ?? 0,
        });
      }
    }
    if (matches.length === 0) return null;
    const highestPriority = Math.max(...matches.map((match) => match.priority));
    const highest = matches.filter(
      (match) => match.priority === highestPriority,
    );
    if (highest.length !== 1) {
      throw new Error(
        `Multiple plugin page types match ${requestedPathname} at priority ${highestPriority}: ${highest
          .map((match) => match.page.type)
          .join(", ")}`,
      );
    }
    return highest[0].page;
  }

  async getPagePaths(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly string[]> {
    return [
      ...new Set(
        (await this.getPageDeclarations(manifest, contentIndex)).map(
          (declaration) => declaration.pathname,
        ),
      ),
    ];
  }

  async getPageRoutes(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly PluginPageRoute[]> {
    return (await this.getPageDeclarations(manifest, contentIndex)).map(
      ({ pathname, plugin, pageType, sourceSlugs }) => ({
        pathname,
        pluginName: plugin.name,
        pageType: pageType.id,
        ...(sourceSlugs && sourceSlugs.length > 0 ? { sourceSlugs } : {}),
      }),
    );
  }

  async getPageOutputs(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly OutputDescriptor[]> {
    const outputs = await Promise.all(
      (await this.getPageDeclarations(manifest, contentIndex)).map(
        async ({ pathname, plugin, pageType }) => {
          const context = {
            ...this.options.createContext(contentIndex),
            manifest,
            pathname,
            renderMarkdown: this.options.renderMarkdown,
          };
          const dependencies = pageType.outputDependencies
            ? typeof pageType.outputDependencies === "function"
              ? await pageType.outputDependencies(
                  this.options.createPluginContext(plugin, context),
                )
              : pageType.outputDependencies
            : [{ type: "unknown" as const }];
          return {
            output: {
              kind: "plugin-page" as const,
              path: pathname,
              producer: `plugin:${plugin.name}:page:${pageType.id}`,
              dependencies,
            },
            priority: pageType.priority ?? 0,
          };
        },
      ),
    );
    return uniqueOutputs(outputs);
  }

  private async getPageDeclarations(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly DeclaredPluginPage[]> {
    const existing = this.pageDeclarations.get(manifest);
    if (existing) return await existing;
    const declarations = this.resolvePageDeclarations(manifest, contentIndex);
    this.pageDeclarations.set(manifest, declarations);
    return await declarations;
  }

  private async resolvePageDeclarations(
    manifest: ContentManifest,
    contentIndex: Map<string, string>,
  ): Promise<readonly DeclaredPluginPage[]> {
    const declarations: DeclaredPluginPage[] = [];
    const context = {
      ...this.options.createContext(contentIndex),
      manifest,
    };
    for (const plugin of this.options.plugins()) {
      for (const pageType of plugin.pageTypes ?? []) {
        const paths = pageType.paths;
        if (!paths) continue;
        const resolved =
          typeof paths === "function"
            ? await paths(this.options.createPluginContext(plugin, context))
            : paths;
        for (const path of resolved) {
          const declaration =
            typeof path === "string" ? { pathname: path } : path;
          declarations.push({
            pathname: normalizePageTypePath(declaration.pathname, pageType),
            plugin,
            pageType,
            ...(declaration.sourceSlugs && declaration.sourceSlugs.length > 0
              ? { sourceSlugs: declaration.sourceSlugs }
              : {}),
          });
        }
      }
    }
    return declarations;
  }
}

export function collectPageTypeOwners(
  plugins: readonly RiebeckitePlugin[],
): void {
  const pageTypes = new Map<string, string>();
  for (const plugin of plugins) {
    const declaredPageTypes = plugin.pageTypes;
    if (declaredPageTypes !== undefined && !Array.isArray(declaredPageTypes)) {
      throw new TypeError(`Plugin ${plugin.name} pageTypes must be an array`);
    }
    for (const pageType of declaredPageTypes ?? []) {
      validatePageType(plugin.name, pageType);
      const previous = pageTypes.get(pageType.id);
      if (previous) {
        throw new Error(
          `Plugin page type "${pageType.id}" is provided by both ${previous} and ${plugin.name}`,
        );
      }
      pageTypes.set(pageType.id, plugin.name);
    }
  }
}

function validatePageType(pluginName: string, pageType: unknown): void {
  if (typeof pageType !== "object" || pageType === null) {
    throw new TypeError(`Plugin ${pluginName} pageTypes must contain objects`);
  }
  const candidate = pageType as {
    id?: unknown;
    resolve?: unknown;
    paths?: unknown;
    priority?: unknown;
    directoryIndex?: unknown;
    outputDependencies?: unknown;
  };
  if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
    throw new TypeError(
      `Plugin ${pluginName} page type id must be a non-empty string`,
    );
  }
  if (typeof candidate.resolve !== "function") {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" must provide a resolve function`,
    );
  }
  if (
    candidate.paths !== undefined &&
    !Array.isArray(candidate.paths) &&
    typeof candidate.paths !== "function"
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" paths must be an array or function`,
    );
  }
  if (
    candidate.priority !== undefined &&
    (typeof candidate.priority !== "number" ||
      !Number.isFinite(candidate.priority))
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" priority must be a finite number`,
    );
  }
  if (
    candidate.outputDependencies !== undefined &&
    !Array.isArray(candidate.outputDependencies) &&
    typeof candidate.outputDependencies !== "function"
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" outputDependencies must be an array or function`,
    );
  }
  if (
    candidate.directoryIndex !== undefined &&
    typeof candidate.directoryIndex !== "boolean"
  ) {
    throw new TypeError(
      `Plugin ${pluginName} page type "${candidate.id}" directoryIndex must be a boolean`,
    );
  }
}

function normalizePageTypePath(
  pathname: string,
  pageType: Pick<PluginPageType, "directoryIndex">,
): string {
  return pageType.directoryIndex
    ? normalizeDirectoryPagePath(pathname)
    : normalizePagePath(pathname);
}

function normalizeDirectoryPagePath(pathname: string): string {
  const path = normalizePagePath(pathname);
  return path === "/" ? path : `${path}/`;
}

function normalizePagePath(pathname: string): string {
  const path = `/${pathname.split("/").filter(Boolean).join("/")}`;
  return path === "/" ? path : path.replace(/\/$/, "");
}

function uniqueOutputs(
  outputs: readonly { output: OutputDescriptor; priority: number }[],
): readonly OutputDescriptor[] {
  const byPath = new Map<
    string,
    { output: OutputDescriptor; priority: number }
  >();
  for (const output of outputs) {
    const previous = byPath.get(output.output.path);
    if (!previous || output.priority > previous.priority) {
      byPath.set(output.output.path, output);
      continue;
    }
    if (output.output.producer === previous.output.producer) continue;
    if (output.priority === previous.priority) {
      throw new Error(
        `Multiple plugin page types declare ${output.output.path} at priority ${output.priority}: ${previous.output.producer}, ${output.output.producer}`,
      );
    }
  }
  return [...byPath.values()]
    .map(({ output }) => output)
    .sort((left, right) => left.path.localeCompare(right.path));
}
