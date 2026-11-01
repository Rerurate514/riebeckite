import { defineInteractiveRuntime } from "../core/registry.js";
import type {
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeLimits,
} from "../core/types.js";

export type MainRuntimeContext = {
  readonly instanceId: string;
  readonly signal: AbortSignal;
  readonly limits: RuntimeLimits;
  readonly root: unknown;
};

export type MainRuntimeOptions<TInput, TOutput> = {
  readonly id: string;
  readonly capabilities?: readonly RuntimeCapability[];
  readonly limits?: RuntimeLimits;
  readonly start?: (context: MainRuntimeContext) => void | Promise<void>;
  readonly invoke: (
    input: TInput,
    context: MainRuntimeContext & {
      readonly requestId: number;
      readonly capability?: RuntimeCapability;
    },
  ) => TOutput | Promise<TOutput>;
  readonly stop?: (context: MainRuntimeContext) => void | Promise<void>;
};

export function createMainRuntime<TInput, TOutput>(
  options: MainRuntimeOptions<TInput, TOutput>,
): RuntimeDefinition<TInput, TOutput> {
  return defineInteractiveRuntime<TInput, TOutput>({
    id: options.id,
    kind: "main",
    capabilities: options.capabilities ?? ["dom"],
    limits: options.limits ?? {},
    create(context) {
      const runtimeContext: MainRuntimeContext = {
        instanceId: context.instanceId,
        signal: context.signal,
        limits: context.limits,
        root: context.root,
      };
      return {
        start: () => options.start?.(runtimeContext),
        invoke: (input, invokeContext) =>
          options.invoke(input, {
            ...runtimeContext,
            requestId: invokeContext.requestId,
            capability: invokeContext.capability,
          }),
        stop: () => options.stop?.(runtimeContext),
      };
    },
  });
}
