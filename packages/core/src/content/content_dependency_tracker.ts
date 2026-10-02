import { createHash } from "node:crypto";
import type {
  ContentSource,
  ContentSourceContent,
  ContentSourceEntry,
} from "./content_source.js";

export type CachedContentDependency = {
  readonly kind: "content" | "file" | "link";
  readonly id: string;
  readonly fingerprint: string;
};

type DependencyIdentity = Pick<CachedContentDependency, "kind" | "id">;

export type ContentDependencyTracker = {
  readonly contentSource: ContentSource;
  readContent(slug: string, read: () => Promise<string>): Promise<string>;
  recordLinkResolution(id: string, value: string): void;
  dependencies(): readonly CachedContentDependency[];
};

export function createContentDependencyTracker(
  source: ContentSource,
): ContentDependencyTracker {
  const dependencies = new Map<string, CachedContentDependency>();

  const record = (
    identity: DependencyIdentity,
    content: ContentSourceContent,
  ) => {
    const normalized = normalizeDependencyIdentity(identity);
    dependencies.set(dependencyKey(normalized), {
      ...normalized,
      fingerprint: fingerprintContent(content),
    });
  };

  return {
    contentSource: {
      scan: () => source.scan(),
      async read(entry: ContentSourceEntry): Promise<ContentSourceContent> {
        const content = await source.read(entry);
        record({ kind: "file", id: entry.path }, content);
        return content;
      },
    },
    async readContent(
      slug: string,
      read: () => Promise<string>,
    ): Promise<string> {
      const content = await read();
      record({ kind: "content", id: slug }, content);
      return content;
    },
    recordLinkResolution(id: string, value: string): void {
      record({ kind: "link", id }, value);
    },
    dependencies: () =>
      [...dependencies.values()].toSorted((left, right) =>
        dependencyKey(left).localeCompare(dependencyKey(right)),
      ),
  };
}

export function fingerprintContent(content: ContentSourceContent): string {
  return `sha256:${createHash("sha256")
    .update(typeof content === "string" ? content : content)
    .digest("hex")}`;
}

export function normalizeDependencyIdentity<T extends DependencyIdentity>(
  dependency: T,
): T {
  return {
    ...dependency,
    id:
      dependency.kind === "file"
        ? dependency.id.replace(/\\/g, "/")
        : dependency.id,
  };
}

export function dependencyKey(dependency: DependencyIdentity): string {
  const normalized = normalizeDependencyIdentity(dependency);
  return `${normalized.kind}:${normalized.id}`;
}
