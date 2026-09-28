import type { Observability } from "../observability.js";
import type { ContentSource, ContentSourceEntry } from "./content_source.js";

/** Caches the source scan and decoded entry contents for one content operation. */
export class ContentEntryReader {
  private entries: readonly ContentSourceEntry[] | null = null;
  private texts = new Map<string, Promise<string>>();

  constructor(
    private readonly source: ContentSource,
    private readonly observability: Observability,
  ) {}

  async getEntries(): Promise<readonly ContentSourceEntry[]> {
    this.entries ??= await this.observability.tracer.span(
      "content.scan",
      {},
      () => this.source.scan(),
    );
    return this.entries;
  }

  async readText(logicalPath: string): Promise<string> {
    const entry = (await this.getEntries()).find(
      (current) => current.path === logicalPath,
    );
    if (!entry) throw new Error(`Content entry was not found: ${logicalPath}`);

    return await this.read(entry);
  }

  read(entry: ContentSourceEntry): Promise<string> {
    const cached = this.texts.get(entry.path);
    if (cached) return cached;

    const content = this.source
      .read(entry)
      .then((value) =>
        typeof value === "string" ? value : new TextDecoder().decode(value),
      );
    this.texts.set(entry.path, content);
    return content;
  }
}
