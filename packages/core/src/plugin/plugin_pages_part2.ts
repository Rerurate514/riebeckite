import { resolvePageLocale } from "../content/content_language.js";
import type { OutputDescriptor } from "../content/output_dependency.js";
import type {
  ContentManifest,
  PluginPageRoute,
} from "../types/content_manifest.js";
import type { ResolvedPluginPage } from "../types/plugin_page.js";
import type {
  DeclaredPluginPage,
  PluginPageResolverOptions,
} from "./plugin_pages_part1.js";
import {
  normalizeDirectoryPagePath,
  normalizePagePath,
  normalizePageTypePath,
  uniqueOutputs,
} from "./plugin_pages_part3.js";

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
          locale: resolvePageLocale(manifest, pagePathname),
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
        locale: resolvePageLocale(manifest, pagePathname),
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
            locale: resolvePageLocale(manifest, pathname),
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
