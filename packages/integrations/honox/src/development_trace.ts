import {
  type BuildTraceRecorder,
  NoopLogger,
  type Observability,
  SinkTracer,
  type TraceEvent,
  type TraceSnapshot,
  type TraceSpan,
} from "@riebeckite/core";

export type DevelopmentTrace = {
  readonly observability: Observability;
  readonly begin: () => void;
  readonly snapshot: () => TraceSnapshot;
};

export function createDevelopmentTrace(): DevelopmentTrace {
  let spans: TraceSpan[] = [];
  let events: TraceEvent[] = [];
  const recorder: BuildTraceRecorder = {
    begin() {
      spans = [];
      events = [];
    },
    snapshot() {
      return Object.freeze({
        spans: Object.freeze(
          spans.map((span) =>
            Object.freeze({
              ...span,
              attributes: Object.freeze({ ...span.attributes }),
            }),
          ),
        ),
        events: Object.freeze(
          events.map((event) =>
            Object.freeze({
              ...event,
              attributes: Object.freeze({ ...event.attributes }),
            }),
          ),
        ),
      });
    },
  };
  const tracer = new SinkTracer({
    onSpan(span) {
      spans.push(span);
    },
    onEvent(event) {
      events.push(event);
    },
  });
  return {
    observability: Object.freeze({ logger: new NoopLogger(), tracer }),
    begin: () => recorder.begin(),
    snapshot: () => recorder.snapshot(),
  };
}
