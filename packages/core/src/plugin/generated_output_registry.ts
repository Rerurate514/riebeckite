import type {
  ContentAssetOutputInput,
  GeneratedOutput,
  GeneratedOutputInput,
  GeneratedOutputSink,
} from "../types/generated_output.js";
import {
  normalizeContentAssetOutputPath,
  normalizeGeneratedOutputPath,
} from "../types/generated_output.js";

/** Owns plugin-generated output and rejects colliding output paths. */
export class GeneratedOutputRegistry {
  private readonly outputs: GeneratedOutput[] = [];
  private readonly owners = new Map<string, string>();

  sinkFor(pluginName: string): GeneratedOutputSink {
    const register = (
      path: string,
      output: GeneratedOutputInput | ContentAssetOutputInput,
    ) => {
      const owner = this.owners.get(path);
      if (owner) {
        throw new Error(
          `Duplicate generated output path "${path}" declared by "${owner}" and "${pluginName}".`,
        );
      }
      this.owners.set(path, pluginName);
      this.outputs.push({
        path,
        content: output.content,
        dependencies: output.dependencies,
        owner: pluginName,
      });
    };
    return {
      emit: (output: GeneratedOutputInput) => {
        register(normalizeGeneratedOutputPath(output.path), output);
      },
      emitAsset: (output: ContentAssetOutputInput) => {
        register(normalizeContentAssetOutputPath(output.path), output);
      },
    };
  }

  all(): GeneratedOutput[] {
    return [...this.outputs].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
  }
}
