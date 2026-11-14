import { queryContentEntries } from "../content/content_query.js";
import type { PluginCache } from "../plugin/plugin_cache.js";
import {
  isCurrentDependency,
  readCache,
  writeCache,
} from "./derived_view_cache.js";
import {
  dependencyKey,
  fingerprint,
  fingerprintQueryEntries,
  isCacheableDependency,
  isJsonValue,
  normalizeDependency,
  toCachedDependency,
  viewIdsFor,
} from "./derived_view_serialize.js";
import { registryInspection, registryStatus } from "./derived_view_status.js";
import type {
  DerivedDependency,
  DerivedView,
  DerivedViewContext,
  DerivedViewExecution,
  DerivedViewOptions,
  DerivedViewRegistry,
  DerivedViewRegistryOptions,
  DerivedViewResolution,
  PendingView,
} from "./derived_view_types.js";
import { waitForConsumer } from "./derived_view_wait.js";

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
  const executions = new Map<string, DerivedViewExecution>();
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
    const startedAt = Date.now();
    let cache: PluginCache | undefined;
    try {
      cache = options.cache?.();
    } catch {}
    let dependencies: DerivedDependency[] = [];
    let cacheStatus: DerivedViewExecution["cache"] = cache ? "miss" : "bypass";
    if (signal.aborted)
      throw signal.reason ?? new Error("Derived View aborted.");
    const cacheKey = `derived-view:${view.id}:${inputFingerprint}`;
    const cached = await readCache(
      cache,
      cacheKey,
      view,
      inputFingerprint,
      (dependency) => isCurrentDependency(dependency, views, options),
    );
    if (cached !== undefined) {
      if (signal.aborted)
        throw signal.reason ?? new Error("Derived View aborted.");
      cacheStatus = "hit";
      dependencies = cached.dependencies;
      const resolution = {
        value: cached.value,
        dependencies,
        viewIds: viewIdsFor(view.id, dependencies),
      };
      executions.set(view.id, {
        id: view.id,
        version: view.version,
        dependencies,
        cache: cacheStatus,
        durationMs: Date.now() - startedAt,
      });
      return resolution;
    }

    dependencies = [];
    const tracked = new Set<string>();
    const addDependency = (dependency: DerivedDependency) => {
      const normalized = normalizeDependency(dependency);
      const key = dependencyKey(normalized);
      if (!tracked.has(key)) {
        tracked.add(key);
        dependencies.push(normalized);
      }
    };
    const context: DerivedViewContext = {
      signal,
      get dependencies() {
        return dependencies;
      },
      track(dependency) {
        addDependency({
          ...dependency,
          fingerprint: options.dependencyFingerprint?.({
            type: dependency.type,
            id: dependency.id,
            property: dependency.property,
          }),
        });
      },
      query(id, definition, queryOptions = {}) {
        const entries = options.queryEntries?.(
          definition.pool ?? "discoverable",
        );
        if (!entries) {
          throw new Error(
            `Derived View "${view.id}" requested content query "${id}" outside a build plan.`,
          );
        }
        const result = queryContentEntries(entries, definition);
        if (queryOptions.where) {
          addDependency({ type: "unknown", id: `${id}:where` });
          return result.filter(queryOptions.where);
        }
        addDependency({
          type: "query",
          id,
          query: definition,
          fingerprint: fingerprintQueryEntries(result),
        });
        return result;
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
          addDependency(dependency);
        addDependency({
          type: "view",
          id: childView.id,
          fingerprint: childView.version,
        });
        return resolved.value;
      }) as DerivedViewContext["resolve"],
    };
    try {
      const computed = await view.compute(input, context);
      if (signal.aborted)
        throw signal.reason ?? new Error("Derived View aborted.");
      const value = view.output ? view.output.parse(computed) : computed;
      if (
        !signal.aborted &&
        isJsonValue(value) &&
        dependencies.every(isCacheableDependency)
      ) {
        await writeCache(cache, cacheKey, {
          version: view.version,
          input: inputFingerprint,
          value,
          dependencies: dependencies.map(toCachedDependency),
        });
      }
      const resolution = {
        value,
        dependencies,
        viewIds: viewIdsFor(view.id, dependencies),
      };
      executions.set(view.id, {
        id: view.id,
        version: view.version,
        dependencies,
        cache: cacheStatus,
        recomputeReason: cache ? "cache-miss" : "cache-disabled",
        durationMs: Date.now() - startedAt,
      });
      return resolution;
    } catch (error) {
      executions.set(view.id, {
        id: view.id,
        version: view.version,
        dependencies,
        cache: cacheStatus,
        recomputeReason: cache ? "cache-miss" : "cache-disabled",
        durationMs: Date.now() - startedAt,
        error: signal.aborted ? "cancelled" : "failed",
      });
      throw error;
    }
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
    status: () => registryStatus(views, pending),
    versionOf: (id) => views.get(id)?.version,
    inspect: () => registryInspection(views, executions),
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
