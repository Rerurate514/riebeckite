import { VFile } from "vfile";
import { matter } from "vfile-matter";

/**
 * Parses a YAML document into plain JavaScript values.
 *
 * @param source - YAML text.
 * @returns The parsed value, or an empty object for an empty document.
 * @throws When the source is not valid YAML.
 */
export function parseYaml(source: string): unknown {
  const file = new VFile({ value: `---\n${source}\n---\n` });
  matter(file);
  return file.data.matter;
}
