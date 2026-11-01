import type {
  RuntimeCapability,
  RuntimeDefinition,
  RuntimeLimits,
} from "../core/types.js";
import { createWorkerRuntime, type WorkerLike } from "./worker.js";

export type WasmWorkerRuntimeOptions<TOutput> = {
  readonly id: string;
  readonly capabilities?: readonly RuntimeCapability[];
  readonly limits?: RuntimeLimits;
  readonly createWorker: () => WorkerLike;
  readonly wasmUrl: string;
  readonly exportName: string;
  readonly mapOutput?: (payload: unknown) => TOutput;
};

export function createWasmWorkerRuntime<
  TInput extends readonly unknown[],
  TOutput = unknown,
>(
  options: WasmWorkerRuntimeOptions<TOutput>,
): RuntimeDefinition<TInput, TOutput> {
  const capabilities = new Set<RuntimeCapability>([
    "worker",
    "wasm",
    "message",
    ...(options.capabilities ?? []),
  ]);
  return createWorkerRuntime<TInput, TOutput>({
    id: options.id,
    kind: "wasm-worker",
    capabilities: [...capabilities],
    limits: options.limits,
    createWorker: options.createWorker,
    init: {
      wasmUrl: options.wasmUrl,
      exportName: options.exportName,
    },
    invokePayload: (input) => input,
    mapResult: (payload) =>
      options.mapOutput ? options.mapOutput(payload) : (payload as TOutput),
  });
}
