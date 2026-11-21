import type {
  SiteTemplateFile,
  SiteTemplateOptions,
  SiteTemplateVariables,
} from "./template_types.js";
import { readTemplate } from "./template-loader.js";
import { RIEBECKITE_VERSION } from "./version.js";

const skillNames = [
  "riebeckite-site",
  "riebeckite-plugin",
  "riebeckite-theme",
  "riebeckite-configuration",
  "riebeckite-troubleshooting",
  "riebeckite-upgrade",
] as const;

export function aiSkillFiles(
  variables: SiteTemplateVariables,
  options: SiteTemplateOptions,
  version = RIEBECKITE_VERSION.replace(/^\^/, ""),
): readonly SiteTemplateFile[] {
  return skillNames.flatMap((name) => [
    {
      path: `.agents/skills/${name}/SKILL.md`,
      content: new TextDecoder()
        .decode(
          readTemplate(
            `ai/skills/${name}${name === "riebeckite-site" && variables.externalContent ? "-external" : ""}.md`,
          ),
        )
        .replaceAll(
          "{{content-directory}}",
          options.contentDirectory ?? "content",
        )
        .replaceAll("{{riebeckite-version}}", version),
    },
    {
      path: `.agents/skills/${name}/references/guide.md`,
      content: new TextDecoder()
        .decode(readTemplate(`ai/skills/references/${name}.md`))
        .replaceAll(
          "{{content-directory}}",
          options.contentDirectory ?? "content",
        )
        .replaceAll("{{riebeckite-version}}", version),
    },
    {
      path: `.agents/skills/${name}/assets/checklist.md`,
      content: new TextDecoder()
        .decode(readTemplate(`ai/skills/assets/${name}.md`))
        .replaceAll(
          "{{content-directory}}",
          options.contentDirectory ?? "content",
        ),
    },
  ]);
}
