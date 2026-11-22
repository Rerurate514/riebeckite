import { aiRuleFiles as files } from "@riebeckite/ai";
import type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";

export function aiRuleFiles(
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions = {},
): readonly SiteTemplateFile[] {
  return files(variables, {
    contentDirectory: options.contentDirectory,
    lint: options.ai?.lint,
  });
}
