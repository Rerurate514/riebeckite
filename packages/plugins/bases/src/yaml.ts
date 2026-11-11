import { parseYaml } from "@riebeckite/core";

export function parseBasesYaml(
  source: string,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string } {
  try {
    return { ok: true, value: parseYaml(source) };
  } catch (error) {
    return {
      ok: false,
      message: `Base definition is not valid YAML (${error instanceof Error ? error.message : String(error)}).`,
    };
  }
}
