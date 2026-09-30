import type {
  GeneratedOutput,
  GeneratedOutputInput,
  GeneratedOutputSink,
} from "../types/generated_output.js";
import { normalizeGeneratedOutputPath } from "../types/generated_output.js";

/** Owns plugin-generated output and rejects colliding output paths. */
export class GeneratedOutputRegistry {
  private readonly outputs: GeneratedOutput[] = [];
  private readonly owners = new Map<string, string>();

  sinkFor(pluginName: string): GeneratedOutputSink {
    return {
      emit: (output: GeneratedOutputInput) => {
        const path = normalizeGeneratedOutputPath(output.path);
        const owner = this.owners.get(path);
        if (owner) {
          throw new Error(
            `Duplicate generated output path "${path}" declared by "${owner}" and "${pluginName}".`,
          );
        }
        this.owners.set(path, pluginName);
        this.outputs.push({ path, content: output.content, owner: pluginName });
      },
    };
  }

  all(): GeneratedOutput[] {
    return [...this.outputs].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
    );
  }
}
