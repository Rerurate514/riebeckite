import { aiSkillFiles as files } from "@riebeckite/ai";
import type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";
import { RIEBECKITE_VERSION } from "./version.js";

export function aiSkillFiles(
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions,
  version = RIEBECKITE_VERSION.replace(/^\^/, ""),
): readonly SiteTemplateFile[] {
  return files(
    variables,
    { contentDirectory: options.contentDirectory },
    version,
  );
}
