import type { TraceAttributes, Tracer } from "@riebeckite/core";

const FAST_PATH_PLAN_SPANS: readonly string[] = [
  "content.discovery",
  "content.fingerprint",
  "content.build-state.load",
  "content.change-set",
  "content.aliases",
  "content.index",
  "content.affected",
  "external.dependencies.resolve",
];

export class FastPathSpanCollector implements Tracer {
  private readonly durations = new Map<string, number>();

  constructor(private readonly delegate: Tracer) {}

  async span<T>(
    name: string,
    attributes: TraceAttributes,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    const startedAt = performance.now();
    try {
      return await this.delegate.span(name, attributes, fn);
    } finally {
      this.durations.set(
        name,
        (this.durations.get(name) ?? 0) + performance.now() - startedAt,
      );
    }
  }

  event(name: string, attributes?: TraceAttributes): void {
    this.delegate.event(name, attributes);
  }

  durationMs(name: string): number {
    return this.durations.get(name) ?? 0;
  }

  planDurationMs(): number {
    return FAST_PATH_PLAN_SPANS.reduce(
      (total, name) => total + this.durationMs(name),
      0,
    );
  }
}
