import type {
  ClientRuntime,
  ClientRuntimeCreateOptions,
  ClientRuntimeHost,
} from "@riebeckite/core/client";
import { RuntimeStateError } from "../core/errors.js";
import type { InteractiveRuntimeRegistry } from "../core/registry.js";
import type {
  InteractiveRuntime,
  RuntimeInstanceOptions,
} from "../core/types.js";

export type ClientRuntimeHostOptions = {
  readonly registry: InteractiveRuntimeRegistry;
  readonly root?: unknown;
  readonly signal?: AbortSignal;
  readonly onError?: RuntimeInstanceOptions["onError"];
};

export function createClientRuntimeHost(
  options: ClientRuntimeHostOptions,
): ClientRuntimeHost {
  const instances = new Set<InteractiveRuntime<unknown, unknown>>();
  let disposed = false;

  return {
    has(id) {
      return options.registry.has(id);
    },
    ids() {
      return options.registry.ids;
    },
    create<TOutput = unknown>(
      id: string,
      createOptions: ClientRuntimeCreateOptions = {},
    ) {
      if (disposed) {
        throw new RuntimeStateError(
          `Client runtime host is disposed; cannot create "${id}".`,
        );
      }
      const instance = options.registry.create<unknown, TOutput>(id, {
        root: createOptions.root ?? options.root,
        signal: createOptions.signal ?? options.signal,
        onError: options.onError,
      });
      instances.add(instance as InteractiveRuntime<unknown, unknown>);
      return instance as unknown as ClientRuntime<TOutput>;
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await Promise.allSettled(
        [...instances].map((instance) => instance.dispose()),
      );
      instances.clear();
    },
  };
}
