import {
  confirm,
  isCancel,
  log,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import type { CreateRiebeckiteOptions } from "./arguments.js";
import type { ScaffoldDeployment } from "./scaffold/options.js";
import {
  SCAFFOLD_PRESETS,
  type ScaffoldPresetName,
} from "./scaffold/presets.js";
import {
  SCAFFOLD_DEFAULT_UTILITIES,
  SCAFFOLD_UTILITIES,
  type ScaffoldUtilityName,
} from "./scaffold/utilities.js";

const DEFAULT_DIRECTORY = "my-riebeckite-site";
export const DEFAULT_INTERACTIVE_DEPLOYMENT: InteractiveDeployment = "none";

export type InteractiveContentSource = "local" | "external";

export type InteractiveDeployment = "cloudflare" | "github-actions" | "none";

export type InteractiveAnswers =
  | {
      readonly directory: string;
      readonly preset: ScaffoldPresetName;
      readonly utilities: readonly ScaffoldUtilityName[];
      readonly contentSource: "local";
      readonly deployment: InteractiveDeployment;
    }
  | {
      readonly directory: string;
      readonly preset: ScaffoldPresetName;
      readonly utilities: readonly ScaffoldUtilityName[];
      readonly contentSource: "external";
      readonly contentRepository: string;
      readonly siteRepository: string;
    };

export type InteractiveSetupAnswers = {
  readonly answers: InteractiveAnswers;
  readonly installDependencies: boolean;
};

export function interactiveAnswersToOptions(
  answers: InteractiveAnswers,
): CreateRiebeckiteOptions {
  return {
    directory: answers.directory,
    force: false,
    preset: answers.preset,
    utilities: answers.utilities,
    listPresets: false,
    deployment: deploymentFromAnswers(answers),
  };
}

function deploymentFromAnswers(
  answers: InteractiveAnswers,
): ScaffoldDeployment {
  if (answers.contentSource === "external") {
    return {
      type: "github-actions",
      content: {
        type: "external",
        contentRepository: answers.contentRepository,
        siteRepository: answers.siteRepository,
      },
    };
  }
  if (answers.deployment === "cloudflare") {
    return { type: "cloudflare-workers" };
  }
  if (answers.deployment === "github-actions") {
    return { type: "github-actions", content: { type: "local" } };
  }
  return { type: "none" };
}

/**
 * Run the prompt flow. Returns `null` when the user cancels, so the caller can
 * exit without a stack trace. Repository values are only trimmed here; their
 * `owner/repository` shape is validated by the existing scaffold.
 */
export async function promptInteractiveAnswers(): Promise<InteractiveSetupAnswers | null> {
  const projectInput = await text({
    message: "Project name",
    placeholder: DEFAULT_DIRECTORY,
    defaultValue: DEFAULT_DIRECTORY,
  });
  if (isCancel(projectInput)) return null;
  const directory = projectInput.trim() || DEFAULT_DIRECTORY;

  const preset = await select<ScaffoldPresetName>({
    message: "What would you like to build?",
    initialValue: "starter",
    options: SCAFFOLD_PRESETS.map(({ name, description }) => ({
      value: name,
      label: presetLabel(name),
      hint: description,
    })),
  });
  if (isCancel(preset)) return null;

  const customize = await confirm({
    message: "Customize extra project files?",
    initialValue: false,
  });
  if (isCancel(customize)) return null;
  const utilities = customize
    ? await multiselect<ScaffoldUtilityName>({
        message: "Extra project files",
        options: SCAFFOLD_UTILITIES.map(({ name, label, description }) => ({
          value: name,
          label,
          hint: description,
        })),
        initialValues: [...SCAFFOLD_DEFAULT_UTILITIES],
        required: false,
      })
    : SCAFFOLD_DEFAULT_UTILITIES;
  if (isCancel(utilities)) return null;

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
      utilities,
      contentSource,
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
    answers = { directory, preset, utilities, contentSource, deployment };
  }

  log.step("Creating Riebeckite site...");
  const installDependencies = await confirm({
    message: "Install dependencies now?",
    initialValue: true,
  });
  if (isCancel(installDependencies)) return null;
  return { answers, installDependencies };
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

function presetLabel(name: ScaffoldPresetName): string {
  const labels: Record<ScaffoldPresetName, string> = {
    starter: "Starter site",
    "digital-garden": "Digital garden",
    blog: "Blog",
    docs: "Documentation",
    minimal: "Minimal site",
    showcase: "Plugin showcase",
    empty: "Empty application",
  };
  return labels[name];
}
