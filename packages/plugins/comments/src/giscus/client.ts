import {
  COMMENTS_MOUNTED_ATTRIBUTE,
  COMMENTS_THREAD_ATTRIBUTE,
  GISCUS_SCRIPT_URL,
} from "../render.js";
import type { CommentsInitializer, GiscusPublicConfig } from "../types.js";

export const initGiscusComments: CommentsInitializer<GiscusPublicConfig> = (
  config,
) => {
  for (const thread of document.querySelectorAll<HTMLElement>(
    `[${COMMENTS_THREAD_ATTRIBUTE}]`,
  )) {
    if (thread.hasAttribute(COMMENTS_MOUNTED_ATTRIBUTE)) continue;
    thread.setAttribute(COMMENTS_MOUNTED_ATTRIBUTE, "true");
    thread.append(createGiscusScript(config));
  }
};

function createGiscusScript(config: GiscusPublicConfig): HTMLScriptElement {
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
