import { isCancel, log, select, text } from "@clack/prompts";
import type { CreateRiebeckiteOptions } from "./arguments.js";
import {
  SCAFFOLD_PRESET_NAMES,
  type ScaffoldPresetName,
  scaffoldPresets,
} from "./scaffold/presets.js";

const DEFAULT_DIRECTORY = "my-riebeckite-site";
export const DEFAULT_INTERACTIVE_DEPLOYMENT: InteractiveDeployment = "none";

export type InteractiveContentSource = "local" | "external";

export type InteractiveDeployment = "cloudflare" | "github-actions" | "none";

export type InteractiveAnswers = {
  readonly directory: string;
  readonly preset: ScaffoldPresetName;
  readonly contentSource: InteractiveContentSource;
  readonly deployment: InteractiveDeployment;
  readonly contentRepository?: string;
  readonly siteRepository?: string;
};

/**
 * Map interactive answers onto the same options object the non-interactive
 * flags produce. A separate content repository always deploys through GitHub
 * Actions, so the answered deployment never wins in that combination.
 */
export function interactiveAnswersToOptions(
  answers: InteractiveAnswers,
): CreateRiebeckiteOptions {
  const external = answers.contentSource === "external";
  return {
    directory: answers.directory,
    force: false,
    preset: answers.preset,
    listPresets: false,
    githubActions: external || answers.deployment === "github-actions",
    cloudflareWorkers: !external && answers.deployment === "cloudflare",
    contentRepository: external ? answers.contentRepository : undefined,
    siteRepository: external ? answers.siteRepository : undefined,
  };
}

/**
 * Run the prompt flow. Returns `null` when the user cancels, so the caller can
 * exit without a stack trace. Repository values are only trimmed here; their
 * `owner/repository` shape is validated by the existing scaffold.
 */
export async function promptInteractiveAnswers(): Promise<InteractiveAnswers | null> {
  const projectInput = await text({
    message: "Project name",
    placeholder: DEFAULT_DIRECTORY,
    defaultValue: DEFAULT_DIRECTORY,
  });
  if (isCancel(projectInput)) return null;
  const directory = projectInput.trim() || DEFAULT_DIRECTORY;

  const preset = await select<ScaffoldPresetName>({
    message: "Choose a preset",
    initialValue: "starter",
    options: SCAFFOLD_PRESET_NAMES.map((name) => ({
      value: name,
      label: capitalize(name),
      hint: scaffoldPresets[name].description,
    })),
  });
  if (isCancel(preset)) return null;

  const contentSource = await select<InteractiveContentSource>({
    message: "Where will you write content?",
    initialValue: "local",
    options: [
      { value: "local", label: "This project" },
      { value: "external", label: "Separate GitHub repository" },
    ],
  });
  if (isCancel(contentSource)) return null;

  let answers: InteractiveAnswers;
  if (contentSource === "external") {
    log.info(
      "Separate repositories use GitHub Actions so content updates can trigger site deployments.",
    );
    const contentRepository = await text({
      message: "Content repository",
      placeholder: "OWNER/notes",
    });
    if (isCancel(contentRepository)) return null;
    const siteRepository = await text({
      message: "Site repository",
      placeholder: "OWNER/site",
    });
    if (isCancel(siteRepository)) return null;
    answers = {
      directory,
      preset,
      contentSource,
      deployment: "github-actions",
      contentRepository: contentRepository.trim(),
      siteRepository: siteRepository.trim(),
    };
  } else {
    const deployment = await select<InteractiveDeployment>({
      message: "Set up deployment?",
      initialValue: DEFAULT_INTERACTIVE_DEPLOYMENT,
      options: [
        {
          value: "cloudflare",
          label: "Cloudflare Workers",
          hint: "Publish from this machine",
        },
        {
          value: "github-actions",
          label: "GitHub Actions",
          hint: "Deploy on every push",
        },
        { value: "none", label: "Not now" },
      ],
    });
    if (isCancel(deployment)) return null;
    answers = { directory, preset, contentSource, deployment };
  }

  log.step("Creating Riebeckite site...");
  return answers;
}

export async function promptDeployNow(): Promise<boolean> {
  const answer = await select<"yes" | "later">({
    message: "Deploy now?",
    initialValue: "yes",
    options: [
      { value: "yes", label: "Yes" },
      { value: "later", label: "Later" },
    ],
  });
  if (isCancel(answer)) return false;
  return answer === "yes";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
