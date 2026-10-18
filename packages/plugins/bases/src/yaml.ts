import { matter } from "vfile-matter";

export function parseBasesYaml(
  source: string,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string } {
  try {
    const document = `---\n${source}\n---\n`;
    const file = {
      value: document,
      data: {} as Record<string, unknown>,
      toString: () => document,
    };
    matter(file as unknown as Parameters<typeof matter>[0]);
    return { ok: true, value: file.data.matter };
  } catch (error) {
    return {
      ok: false,
      message: `Base definition is not valid YAML (${error instanceof Error ? error.message : String(error)}).`,
    };
  }
}
