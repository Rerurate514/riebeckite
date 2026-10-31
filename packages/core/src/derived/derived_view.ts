import crypto from "node:crypto";
import type { JsonValue, PluginCache } from "../plugin/plugin_cache.js";
import { stableStringify } from "../plugin/plugin_memo.js";
import type { OutputDependency } from "../types/output_dependency.js";

export type DerivedSchema<T> = {
  parse(value: unknown): T;
};

export type DerivedDependency = {
  readonly type:
    | "content"
    | "frontmatter"
    | "file"
    | "external"
    | "query"
    | "graph"
    | "view"
    | "unknown";
  readonly id: string;
  readonly fingerprint?: string;
  readonly property?: string;
  readonly properties?: readonly string[];
};

export type DerivedViewResolution<TResult> = {
  readonly value: TResult;
  readonly dependencies: readonly DerivedDependency[];
};

export type DerivedViewContext = {
  readonly signal: AbortSignal;
  readonly dependencies: readonly DerivedDependency[];
  track(dependency: DerivedDependency): void;
  resolve<TResult>(view: string, input: unknown): Promise<TResult>;
  resolve<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
  ): Promise<TResult>;
};

export type DerivedView<TInput, TResult> = {
  readonly id: string;
  readonly version: string;
  readonly input?: DerivedSchema<TInput>;
  readonly output?: DerivedSchema<TResult>;
  readonly compute: {
    bivarianceHack(
      input: TInput,
      context: DerivedViewContext,
    ): TResult | Promise<TResult>;
  }["bivarianceHack"];
};

export type DerivedViewOptions<TInput, TResult> = DerivedView<TInput, TResult>;

export type DerivedViewStatus = {
  readonly id: string;
  readonly version: string;
  readonly pending: number;
};

export type DerivedViewRegistry = {
  register<TInput, TResult>(view: DerivedView<TInput, TResult>): void;
  resolve<TResult>(
    view: string,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<TResult>;
  resolve<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
    options?: { signal?: AbortSignal },
  ): Promise<TResult>;
  resolveWithDependencies<TResult>(
    view: string,
    input: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<DerivedViewResolution<TResult>>;
  resolveWithDependencies<TInput, TResult>(
    view: DerivedView<TInput, TResult>,
    input: TInput,
    options?: { signal?: AbortSignal },
  ): Promise<DerivedViewResolution<TResult>>;
  status(): readonly DerivedViewStatus[];
  dispose(): void;
};

type CacheEntry = {
  readonly version: string;
  readonly input: string;
  readonly value: JsonValue;
  readonly dependencies: CachedDependency[];
};

type CachedDependency = {
  type: DerivedDependency["type"];
  id: string;
  fingerprint: string;
  property?: string;
  properties?: string[];
};

type PendingView = {
  readonly controller: AbortController;
  readonly promise: Promise<DerivedViewResolution<unknown>>;
  consumers: number;
};

export type DerivedViewRegistryOptions = {
  readonly cache?: () => PluginCache;
  readonly dependencyFingerprint?: (
    dependency: Omit<DerivedDependency, "fingerprint">,
  ) => string | undefined;
};

export function defineDerivedView<TInput, TResult>(
  view: DerivedViewOptions<TInput, TResult>,
): DerivedView<TInput, TResult> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(view.id)) {
    throw new TypeError(`Derived View id "${view.id}" is invalid.`);
  }
  if (view.version.trim().length === 0) {
    throw new TypeError(`Derived View "${view.id}" must declare a version.`);
  }
  return Object.freeze({ ...view });
}

export function createDerivedViewRegistry(
  options: DerivedViewRegistryOptions = {},
): DerivedViewRegistry {
  const views = new Map<string, DerivedView<unknown, unknown>>();
  const pending = new Map<string, PendingView>();
  let disposed = false;

  const resolveWithDependencies = async <TInput, TResult>(
    reference: DerivedView<TInput, TResult> | string,
    input: TInput,
    resolveOptions: { signal?: AbortSignal } = {},
    stack: readonly string[] = [],
  ): Promise<DerivedViewResolution<TResult>> => {
    if (disposed) throw new Error("Derived View registry has been disposed.");
    const view = resolveView(reference);
    if (stack.includes(view.id)) {
      throw new Error(
        `Derived View cycle detected: ${[...stack, view.id].join(" -> ")}`,
      );
    }
    const parsedInput = view.input ? view.input.parse(input) : input;
    const inputFingerprint = fingerprint(
      parsedInput,
      `Derived View "${view.id}" input`,
    );
    const key = `${view.id}:${inputFingerprint}`;
    let inFlight = pending.get(key);
    if (!inFlight) {
      const controller = new AbortController();
      const run = execute(
        view,
        parsedInput,
        inputFingerprint,
        controller.signal,
        [...stack, view.id],
      );
      inFlight = { controller, promise: run, consumers: 0 };
      pending.set(key, inFlight);
      void run.then(
        () => {
          if (pending.get(key) === inFlight) pending.delete(key);
        },
        () => {
          if (pending.get(key) === inFlight) pending.delete(key);
        },
      );
    }
    return (await waitForConsumer(inFlight, resolveOptions.signal, () => {
      if (pending.get(key) === inFlight && inFlight.consumers === 0) {
        pending.delete(key);
        inFlight.controller.abort(
          new Error("All Derived View consumers aborted."),
        );
      }
    })) as DerivedViewResolution<TResult>;
  };

  const execute = async (
    view: DerivedView<unknown, unknown>,
    input: unknown,
    inputFingerprint: string,
    signal: AbortSignal,
    stack: readonly string[],
  ): Promise<DerivedViewResolution<unknown>> => {
    if (signal.aborted)
      throw signal.reason ?? new Error("Derived View aborted.");
    const cacheKey = `derived-view:${view.id}:${inputFingerprint}`;
    const cached = await readCache(cacheKey, view, inputFingerprint);
    if (cached !== undefined) {
      if (signal.aborted)
        throw signal.reason ?? new Error("Derived View aborted.");
      return { value: cached.value, dependencies: cached.dependencies };
    }

    const dependencies: DerivedDependency[] = [];
    const tracked = new Set<string>();
    const context: DerivedViewContext = {
      signal,
      get dependencies() {
        return dependencies;
      },
      track(dependency) {
        const trackedDependency = normalizeDependency(dependency);
        const normalized = {
          ...trackedDependency,
          fingerprint:
            options.dependencyFingerprint?.({
              type: trackedDependency.type,
              id: trackedDependency.id,
              property: trackedDependency.property,
              properties: trackedDependency.properties,
            }) ?? trackedDependency.fingerprint,
        };
        const key = dependencyKey(normalized);
        if (!tracked.has(key)) {
          tracked.add(key);
          dependencies.push(normalized);
        }
      },
      resolve: (async <TInput, TResult>(
        child: DerivedView<TInput, TResult> | string,
        childInput: TInput,
      ) => {
        const childView = resolveView(child);
        const resolved = await resolveWithDependencies(
          childView,
          childInput,
          { signal },
          stack,
        );
        for (const dependency of resolved.dependencies)
          context.track(dependency);
        context.track({
          type: "view",
          id: childView.id,
          fingerprint: childView.version,
        });
        return resolved.value;
      }) as DerivedViewContext["resolve"],
    };
    const computed = await view.compute(input, context);
    if (signal.aborted)
      throw signal.reason ?? new Error("Derived View aborted.");
    const value = view.output ? view.output.parse(computed) : computed;
    if (
      !signal.aborted &&
      isJsonValue(value) &&
      dependencies.every(isCacheableDependency)
    ) {
      await writeCache(cacheKey, {
        version: view.version,
        input: inputFingerprint,
        value,
        dependencies: dependencies.map(toCachedDependency),
      });
    }
    return { value, dependencies };
  };

  const readCache = async (
    key: string,
    view: DerivedView<unknown, unknown>,
    input: string,
  ): Promise<CacheEntry | undefined> => {
    try {
      const entry = await options.cache?.().get<CacheEntry>(key);
      if (!isCacheEntry(entry, view, input)) return undefined;
      if (!entry.dependencies.every(isCurrentDependency)) return undefined;
      return entry;
    } catch {
      return undefined;
    }
  };

  const writeCache = async (key: string, entry: CacheEntry): Promise<void> => {
    try {
      await options.cache?.().set(key, entry);
    } catch {
      return;
    }
  };

  const isCurrentDependency = (dependency: DerivedDependency): boolean => {
    if (!dependency.fingerprint) return false;
    if (dependency.type === "unknown") return false;
    if (dependency.type === "view") {
      return views.get(dependency.id)?.version === dependency.fingerprint;
    }
    const current = options.dependencyFingerprint?.({
      type: dependency.type,
      id: dependency.id,
      property: dependency.property,
      properties: dependency.properties,
    });
    return current === dependency.fingerprint;
  };

  const resolveView = <TInput, TResult>(
    reference: DerivedView<TInput, TResult> | string,
  ): DerivedView<TInput, TResult> => {
    const id = typeof reference === "string" ? reference : reference.id;
    const view = views.get(id);
    if (!view) throw new Error(`Derived View "${id}" is not registered.`);
    return view as DerivedView<TInput, TResult>;
  };

  const resolve = async <TInput, TResult>(
    reference: DerivedView<TInput, TResult> | string,
    input: TInput,
    resolveOptions: { signal?: AbortSignal } = {},
  ): Promise<TResult> => {
    return (await resolveWithDependencies(reference, input, resolveOptions))
      .value;
  };

  return {
    register(view) {
      if (disposed) throw new Error("Derived View registry has been disposed.");
      if (views.has(view.id))
        throw new Error(`Derived View "${view.id}" is already registered.`);
      views.set(view.id, view as DerivedView<unknown, unknown>);
    },
    resolve: resolve as DerivedViewRegistry["resolve"],
    resolveWithDependencies:
      resolveWithDependencies as DerivedViewRegistry["resolveWithDependencies"],
    status: () =>
      [...views.values()]
        .map((view) => ({
          id: view.id,
          version: view.version,
          pending: [...pending.keys()].filter((key) =>
            key.startsWith(`${view.id}:`),
          ).length,
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    dispose: () => {
      disposed = true;
      for (const entry of pending.values()) {
        entry.controller.abort(
          new Error("Derived View registry has been disposed."),
        );
      }
      pending.clear();
    },
  };
}

export function derivedDependenciesToOutputDependencies(
  dependencies: readonly DerivedDependency[],
): readonly OutputDependency[] {
  const outputDependencies: OutputDependency[] = [];
  for (const dependency of dependencies) {
    switch (dependency.type) {
      case "content":
      case "frontmatter":
        outputDependencies.push({ type: "content", slug: dependency.id });
        break;
      case "file":
        outputDependencies.push({ type: "file", path: dependency.id });
        break;
      case "external":
        outputDependencies.push({ type: "external", id: dependency.id });
        break;
      case "query":
        if (dependency.properties) {
          outputDependencies.push({
            type: "content-query",
            properties: [...dependency.properties].sort(),
          });
        } else {
          outputDependencies.push({ type: "unknown" });
        }
        break;
      case "graph":
        outputDependencies.push({
          type: "content-query",
          properties: ["file.links"],
        });
        break;
      case "unknown":
        outputDependencies.push({ type: "unknown" });
        break;
      case "view":
        break;
      default:
        outputDependencies.push({ type: "unknown" });
        break;
    }
  }
  const seen = new Set<string>();
  return outputDependencies.filter((dependency) => {
    const key = stableStringify(dependency as JsonValue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function waitForConsumer(
  pending: PendingView,
  signal: AbortSignal | undefined,
  onRelease: () => void,
): Promise<unknown> {
  if (signal?.aborted)
    return Promise.reject(signal.reason ?? new Error("Derived View aborted."));
  pending.consumers++;
  return new Promise((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      pending.consumers--;
      signal?.removeEventListener("abort", abort);
      pending.controller.signal.removeEventListener("abort", abortShared);
      onRelease();
    };
    const abort = () => {
      release();
      reject(signal?.reason ?? new Error("Derived View aborted."));
    };
    const abortShared = () => {
      release();
      reject(
        pending.controller.signal.reason ?? new Error("Derived View aborted."),
      );
    };
    signal?.addEventListener("abort", abort, { once: true });
    pending.controller.signal.addEventListener("abort", abortShared, {
      once: true,
    });
    void pending.promise.then(
      (value) => {
        release();
        resolve(value);
      },
      (error: unknown) => {
        release();
        reject(error);
      },
    );
  });
}

function normalizeDependency(dependency: DerivedDependency): DerivedDependency {
  return {
    ...dependency,
    id: dependency.id.replace(/\\/g, "/"),
  };
}

function toCachedDependency(dependency: DerivedDependency): CachedDependency {
  return {
    type: dependency.type,
    id: dependency.id,
    fingerprint: dependency.fingerprint || "",
    ...(dependency.property === undefined
      ? {}
      : { property: dependency.property }),
    ...(dependency.properties === undefined
      ? {}
      : { properties: [...dependency.properties] }),
  };
}

function dependencyKey(dependency: DerivedDependency): string {
  return JSON.stringify({
    type: dependency.type,
    id: dependency.id,
    fingerprint: dependency.fingerprint,
    property: dependency.property,
    properties: dependency.properties && [...dependency.properties].sort(),
  });
}

function isCacheEntry(
  value: unknown,
  view: DerivedView<unknown, unknown>,
  input: string,
): value is CacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<CacheEntry>;
  return (
    entry.version === view.version &&
    entry.input === input &&
    isJsonValue(entry.value) &&
    Array.isArray(entry.dependencies) &&
    entry.dependencies.every(isDependency)
  );
}

function isDependency(value: unknown): value is CachedDependency {
  if (!value || typeof value !== "object") return false;
  const dependency = value as Partial<CachedDependency>;
  return (
    (dependency.type === "content" ||
      dependency.type === "file" ||
      dependency.type === "external" ||
      dependency.type === "query" ||
      dependency.type === "frontmatter" ||
      dependency.type === "graph" ||
      dependency.type === "view" ||
      dependency.type === "unknown") &&
    typeof dependency.id === "string" &&
    typeof dependency.fingerprint === "string" &&
    (dependency.property === undefined ||
      typeof dependency.property === "string") &&
    (dependency.properties === undefined ||
      (Array.isArray(dependency.properties) &&
        dependency.properties.every(
          (property) => typeof property === "string",
        )))
  );
}

function isCacheableDependency(
  dependency: DerivedDependency,
): dependency is DerivedDependency & { fingerprint: string } {
  return (
    dependency.type !== "unknown" && typeof dependency.fingerprint === "string"
  );
}

function fingerprint(value: unknown, label: string): string {
  const hash = crypto.createHash("sha256");
  if (value === undefined) return hash.update("undefined").digest("hex");
  if (!isJsonValue(value)) {
    throw new TypeError(`${label} must be JSON-serializable.`);
  }
  return hash.update(stableStringify(value)).digest("hex");
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value as Record<string, unknown>).every(isJsonValue)
  );
}
