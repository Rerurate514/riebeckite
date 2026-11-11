import type { PostContent } from "../types/post_content.js";

export type ContentFormatProcessContext = {
  readonly slug: string;
  readonly sourcePath: string;
  readonly source: string;
  readonly processMarkdown: (source: string) => Promise<PostContent>;
};

export type ContentFormatDependencyContext = {
  readonly sourcePath: string;
  readonly source: string;
  readonly paths: readonly string[];
};

export type ContentFormat = {
  readonly extension: string;
  readonly rendererModule?: string;
  readonly rendererOptions?: unknown;
  readonly process?: (
    context: ContentFormatProcessContext,
  ) => Promise<PostContent>;
  readonly dependencies?: (
    context: ContentFormatDependencyContext,
  ) => readonly string[] | Promise<readonly string[]>;
};

export class ContentFormatRegistry {
  private readonly byExtension = new Map<string, ContentFormat>();

  constructor(formats: readonly ContentFormat[] = []) {
    this.register({ extension: ".md" });
    for (const format of formats) this.register(format);
  }

  private register(format: ContentFormat) {
    const extension = normalizeExtension(format.extension);
    if (this.byExtension.has(extension)) {
      throw new Error(`Content format is already registered: ${extension}`);
    }
    this.byExtension.set(extension, { ...format, extension });
  }

  get(path: string): ContentFormat | undefined {
    return [...this.byExtension.values()].find((format) =>
      path.toLowerCase().endsWith(format.extension),
    );
  }

  isContentPath(path: string): boolean {
    return this.get(path) !== undefined;
  }

  toSlug(path: string): string | undefined {
    const format = this.get(path);
    return format ? path.slice(0, -format.extension.length) : undefined;
  }
}

export function createContentFormatRegistry(
  plugins: readonly (
    | { readonly contentFormats?: readonly ContentFormat[] }
    | undefined
  )[] = [],
): ContentFormatRegistry {
  return new ContentFormatRegistry(
    plugins.flatMap((plugin) => plugin?.contentFormats ?? []),
  );
}

function normalizeExtension(extension: string): string {
  const value = extension.startsWith(".") ? extension : `.${extension}`;
  if (!/^\.[a-z0-9]+$/i.test(value)) {
    throw new Error(`Invalid content format extension: ${extension}`);
  }
  return value.toLowerCase();
}
