import {
  confirm,
  isCancel,
  log,
  multiselect,
  select,
  text,
} from "@clack/prompts";
import type { CreateRiebeckiteOptions } from "./arguments.js";
import type {
  ScaffoldAiOptions,
  ScaffoldDeployment,
  ScaffoldPackageManager,
} from "./scaffold/options.js";
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
const DEFAULT_INTERACTIVE_DEPLOYMENT: InteractiveDeployment = "none";

type InteractiveContentSource = "local" | "directory" | "external";

type InteractiveDeployment = "cloudflare" | "github-actions" | "none";

type InteractiveAnswers =
  | {
      readonly directory: string;
      readonly preset: ScaffoldPresetName;
      readonly utilities: readonly ScaffoldUtilityName[];
      readonly contentSource: "local" | "directory";
      readonly contentDirectory?: string;
      readonly deployment: InteractiveDeployment;
      readonly ai?: ScaffoldAiOptions;
      readonly packageManager?: ScaffoldPackageManager;
    }
  | {
      readonly directory: string;
      readonly preset: ScaffoldPresetName;
      readonly utilities: readonly ScaffoldUtilityName[];
      readonly contentSource: "external";
      readonly contentRepository: string;
      readonly siteRepository: string;
      readonly cloneContent?: boolean;
      readonly ai?: ScaffoldAiOptions;
      readonly packageManager?: ScaffoldPackageManager;
    };

type InteractiveSetupAnswers = {
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
    ...(answers.contentSource === "directory" &&
    answers.contentDirectory !== undefined
      ? { contentDirectory: answers.contentDirectory }
      : {}),
    ...(answers.contentSource === "external" && answers.cloneContent === true
      ? { cloneContent: true }
      : {}),
    ...(answers.ai === undefined ? {} : { ai: answers.ai }),
    ...(answers.packageManager === undefined
      ? {}
      : { packageManager: answers.packageManager }),
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

  const packageManager = await select<ScaffoldPackageManager>({
    message: "Which package manager?",
    initialValue: "npm",
    options: [
      { value: "npm", label: "npm", hint: "Uses package-lock.json" },
      { value: "pnpm", label: "pnpm", hint: "Commit pnpm-lock.yaml" },
    ],
  });
  if (isCancel(packageManager)) return null;

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

  const addAiSupport = await confirm({
    message: "Add AI development support?",
    initialValue: false,
  });
  if (isCancel(addAiSupport)) return null;
  const ai = addAiSupport ? await promptAiOptions() : undefined;
  if (ai === null) return null;

  const contentSource = await select<InteractiveContentSource>({
    message: "Where will you write content?",
    initialValue: "local",
    options: [
      { value: "local", label: "This project" },
      {
        value: "directory",
        label: "Separate directory in this repository",
        hint: "For example, site/ + vault/",
      },
      { value: "external", label: "Separate GitHub repository" },
    ],
  });
  if (isCancel(contentSource)) return null;

  let contentDirectory: string | undefined;
  let answers: InteractiveAnswers;
  if (contentSource === "directory") {
    const directoryInput = await text({
      message: "Content directory",
      placeholder: "../vault",
      defaultValue: "../vault",
    });
    if (isCancel(directoryInput)) return null;
    contentDirectory = directoryInput.trim() || "../vault";
  }
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
    const cloneContent = await confirm({
      message:
        "Clone the content repository into ./content for local development?",
      initialValue: true,
    });
    if (isCancel(cloneContent)) return null;
    answers = {
      directory,
      preset,
      utilities,
      contentSource,
      contentRepository: contentRepository.trim(),
      siteRepository: siteRepository.trim(),
      cloneContent,
      ...(ai === undefined ? {} : { ai }),
      packageManager,
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
    answers = {
      directory,
      preset,
      utilities,
      contentSource,
      ...(contentDirectory === undefined ? {} : { contentDirectory }),
      deployment,
      ...(ai === undefined ? {} : { ai }),
      packageManager,
    };
  }

  log.step("Creating Riebeckite site...");
  const installDependencies = await confirm({
    message: "Install dependencies now?",
    initialValue: true,
  });
  if (isCancel(installDependencies)) return null;
  return { answers, installDependencies };
}

async function promptAiOptions(): Promise<ScaffoldAiOptions | null> {
  const mcp = await confirm({
    message: "Add the Riebeckite MCP server?",
    initialValue: true,
  });
  if (isCancel(mcp)) return null;
  const lint = await confirm({
    message: "Add a content lint script?",
    initialValue: true,
  });
  if (isCancel(lint)) return null;
  const rules = await confirm({
    message: "Generate AI site rules?",
    initialValue: true,
  });
  if (isCancel(rules)) return null;
  const skills = await confirm({
    message:
      "Add Riebeckite development Skills to .agents/skills/ for OpenCode?",
    initialValue: true,
  });
  if (isCancel(skills)) return null;
  return { mcp, lint, rules, skills };
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
    writer: "Writer",
    docs: "Documentation",
    portfolio: "Portfolio",
    minimal: "Minimal site",
    empty: "Empty application",
  };
  return labels[name];
}
