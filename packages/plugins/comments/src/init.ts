import {
  COMMENTS_ATTRIBUTE,
  GISCUS_CONTAINER_CLASS,
  GISCUS_SCRIPT_URL,
} from "./render.js";
import type { CommentsPublicConfig } from "./types.js";

const READY_ATTRIBUTE = "data-rr-comments-mounted";

export function initComments(config?: CommentsPublicConfig): void {
  if (!config) return;
  const sections = document.querySelectorAll<HTMLElement>(
    `[${COMMENTS_ATTRIBUTE}]`,
  );
  for (const section of sections) {
    if (section.hasAttribute(READY_ATTRIBUTE)) continue;
    const container = section.querySelector<HTMLElement>(
      `.${GISCUS_CONTAINER_CLASS}`,
    );
    if (!container) continue;
    section.setAttribute(READY_ATTRIBUTE, "true");
    container.append(createGiscusScript(config));
  }
}

function createGiscusScript(config: CommentsPublicConfig): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = GISCUS_SCRIPT_URL;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.repo = config.repo;
  script.dataset.repoId = config.repoId;
  script.dataset.category = config.category;
  script.dataset.categoryId = config.categoryId;
  script.dataset.mapping = config.mapping;
  script.dataset.strict = config.strict;
  script.dataset.reactionsEnabled = config.reactionsEnabled;
  script.dataset.inputPosition = config.inputPosition;
  script.dataset.theme = config.theme;
  script.dataset.lang = config.lang;
  return script;
}
