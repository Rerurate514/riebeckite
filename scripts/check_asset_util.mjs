import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  isExecutableScript,
  isStylesheet,
  parseHtmlTags,
} from "./check_asset_html.mjs";

export async function collectTargetHeads(assetsDirectory) {
  const result = {};
  for (const name of ["index.html", "README.html"]) {
    try {
      const html = await readFile(path.join(assetsDirectory, name), "utf8");
      const tags = parseHtmlTags(
        html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/iu)?.[1] ?? "",
      );
      result[name] = {
        stylesheets: tags
          .filter(isStylesheet)
          .map((tag) => tag.attributes.href),
        scripts: tags
          .filter(isExecutableScript)
          .map((tag) => tag.attributes.src),
      };
    } catch {
      result[name] = null;
    }
  }
  return result;
}

export function stripJsonComments(source) {
  let result = "";
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote) {
      result += character;
      if (character === "\\") result += source[++index] ?? "";
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"') {
      quote = character;
      result += character;
    } else if (character === "/" && next === "/") {
      index = source.indexOf("\n", index);
      if (index === -1) break;
      result += "\n";
    } else if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 1;
    } else {
      result += character;
    }
  }
  return result;
}
